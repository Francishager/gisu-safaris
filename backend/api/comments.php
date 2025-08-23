<?php
/**
 * Blog Comments API Endpoint
 * - Accepts comment submissions with explicit consent
 * - Stores comments in PostgreSQL
 * - Sends admin notifications
 * - Optionally returns approved comments per page (GET)
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/email.php';

// CORS and Security Headers
setCorsHeaders();
setSecurityHeaders();

// Basic rate limiting and session
checkRateLimit();
initSession();

// Log access
logEvent('info', 'Comments API accessed', ['method' => $_SERVER['REQUEST_METHOD']]);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $db = getDbConnection();

    // Safe idempotent migration: create comments table if missing
    $db->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS comments (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            page_path TEXT NOT NULL,
            name VARCHAR(100),
            email VARCHAR(255),
            comment TEXT NOT NULL,
            consent BOOLEAN DEFAULT false,
            status VARCHAR(20) DEFAULT 'pending', -- pending|approved|rejected
            ip_address INET,
            user_agent TEXT,
            referrer_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
SQL);

    // Ensure indexes and trigger
    $db->exec("CREATE INDEX IF NOT EXISTS idx_comments_page ON comments(page_path);");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);");
    $db->exec("CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);");
    $db->exec(<<<SQL
        CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
        BEFORE UPDATE ON comments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
SQL);

    if ($method === 'GET') {
        // Optional: fetch approved comments for a given page
        $page = $_GET['page'] ?? $_GET['pagePath'] ?? '';
        $page = sanitizeInput($page);
        if (empty($page)) {
            sendJsonResponse(null, 400, 'Missing page parameter');
        }

        $stmt = $db->prepare("SELECT id, name, comment, created_at FROM comments WHERE page_path = ? AND status = 'approved' ORDER BY created_at ASC");
        $stmt->execute([$page]);
        $rows = $stmt->fetchAll();

        // Anonymize empty names
        $rows = array_map(function ($r) {
            if (empty($r['name'])) { $r['name'] = 'Anonymous'; }
            return $r;
        }, $rows);

        sendJsonResponse(['comments' => $rows], 200, 'Approved comments loaded');
    }

    if ($method !== 'POST') {
        sendJsonResponse(null, 405, 'Method not allowed');
    }

    // Enforce JSON
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') === false) {
        sendJsonResponse(null, 415, 'Unsupported Media Type: application/json required');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON data');
    }

    // Required fields
    $pagePath = sanitizeInput($input['pagePath'] ?? $input['page'] ?? '');
    $comment  = trim((string)($input['comment'] ?? ''));
    $consent  = (bool)($input['consent'] ?? false);

    // Name required (accept alias fname)
    $nameRaw = ($input['name'] ?? ($input['fname'] ?? ''));
    $name    = trim((string)$nameRaw);
    $email   = trim((string)($input['email'] ?? ''));

    if (empty($pagePath) || empty($comment) || $name === '' || $email === '') {
        sendJsonResponse([
            'missing' => [
                'pagePath' => (bool)$pagePath,
                'comment'  => (bool)$comment,
                'name'     => (bool)$name,
                'email'    => (bool)$email
            ]
        ], 400, 'Missing required fields');
    }

    // Privacy: email required, therefore consent must be given
    if (!$consent) {
        sendJsonResponse(null, 400, 'Consent is required to store your email');
    }

    if ($email !== '') {
        $email = filter_var($email, FILTER_SANITIZE_EMAIL);
        if (!isValidEmail($email)) {
            sendJsonResponse(null, 400, 'Invalid email address');
        }
    }

    // Validate required name
    if (!preg_match("/^[A-Za-z'\-\s]{2,60}$/", $name)) {
        sendJsonResponse(null, 400, 'Invalid name');
    }

    // Minimal spam guards
    if (strlen($comment) < 3 || strlen($comment) > 5000) {
        sendJsonResponse(null, 400, 'Comment length out of bounds');
    }

    // Duplicate submission guard: same ip + page + body in last 2 minutes
    $dupStmt = $db->prepare("SELECT 1 FROM comments WHERE page_path = ? AND comment = ? AND ip_address = ? AND created_at > NOW() - INTERVAL '2 minutes' LIMIT 1");
    $dupStmt->execute([$pagePath, $comment, getClientIp()]);
    if ($dupStmt->fetchColumn()) {
        sendJsonResponse(null, 429, 'Duplicate submission detected. Please wait before submitting again.');
    }

    // Insert comment (default status pending for moderation)
    $stmt = $db->prepare("INSERT INTO comments (page_path, name, email, comment, consent, status, ip_address, user_agent, referrer_url) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?) RETURNING id");
    $stmt->execute([
        $pagePath,
        $name !== '' ? $name : null,
        $email !== '' ? $email : null,
        $comment,
        $consent,
        getClientIp(),
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $_SERVER['HTTP_REFERER'] ?? ''
    ]);
    $comment_id = $stmt->fetch()['id'] ?? null;

    // Notify admins
    try {
        $dispName = $name !== '' ? $name : 'Anonymous';
        $subject = "New Blog Comment - {$pagePath} - {$dispName}";
        $body = generateAdminCommentEmail([
            'id' => $comment_id,
            'page_path' => $pagePath,
            'name' => $dispName,
            'email' => $email,
            'comment' => $comment,
            'consent' => $consent,
            'ip' => getClientIp(),
        ]);
        sendMultipleAdminEmails($subject, $body);
    } catch (Exception $e) {
        logEvent('warning', 'Failed to send admin comment notification', ['error' => $e->getMessage(), 'comment_id' => $comment_id]);
    }

    logEvent('info', 'Comment submitted', ['comment_id' => $comment_id, 'page' => $pagePath]);

    sendJsonResponse([
        'comment_id' => $comment_id,
        'status' => 'pending',
        'message' => 'Thank you! Your comment was submitted and is awaiting moderation.'
    ], 200, 'Comment submitted');

} catch (PDOException $e) {
    logEvent('error', 'Database error in comments API', [
        'error' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
    sendJsonResponse(null, 500, 'Database error occurred');
} catch (Exception $e) {
    logEvent('error', 'General error in comments API', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    sendJsonResponse(null, 500, 'An error occurred while processing your request');
}

/**
 * Generate admin email for new comment
 */
function generateAdminCommentEmail(array $data): string {
    $h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    $emailLine = !empty($data['email']) ? "<p><strong>Email:</strong> {$h($data['email'])}</p>" : '';

    return "
    <html>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <h2 style='color:#2E7D32;'>New Blog Comment Submitted</h2>
        <div style='background:#f5f5f5;padding:16px;border-radius:6px;margin:12px 0;'>
            <p><strong>Comment ID:</strong> {$h($data['id'])}</p>
            <p><strong>Page:</strong> {$h($data['page_path'])}</p>
            <p><strong>Name:</strong> {$h($data['name'])}</p>
            {$emailLine}
            <p><strong>Consent:</strong> " . ($data['consent'] ? 'Yes' : 'No') . "</p>
            <p><strong>IP:</strong> {$h($data['ip'])}</p>
        </div>
        <div style='background:#fff3cd;padding:16px;border-radius:6px;margin:12px 0;'>
            <h3>Comment</h3>
            <p>" . nl2br($h($data['comment'])) . "</p>
        </div>
        <p style='color:#666;font-size:.9em;'>Moderation required: comment is currently <strong>pending</strong>.</p>
    </body>
    </html>
    ";
}
