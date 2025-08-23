<?php
/**
 * Posts API (DB-driven blogging)
 * - GET /posts.php?list=1&limit=... : list published posts
 * - GET /posts.php?slug=... : get single post by slug
 * - POST /posts.php : create/update post (requires X-API-Key)
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';

setCorsHeaders();
setSecurityHeaders();
checkRateLimit();
initSession();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $db = getDbConnection();

    // Auto-migrate posts table
    $db->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS posts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            slug TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            summary TEXT,
            content_html TEXT NOT NULL,
            hero_image TEXT,
            status VARCHAR(20) DEFAULT 'published', -- draft|published
            published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
SQL);
    $db->exec("CREATE INDEX IF NOT EXISTS idx_posts_status_pub ON posts(status, published_at DESC);");
    $db->exec(<<<SQL
        CREATE TRIGGER IF NOT EXISTS update_posts_updated_at
        BEFORE UPDATE ON posts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
SQL);

    // Audit table for post changes
    $db->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS posts_audit (
            id BIGSERIAL PRIMARY KEY,
            slug TEXT NOT NULL,
            action TEXT NOT NULL, -- create|update
            actor TEXT,           -- session_user or 'api_key'
            ip INET,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
SQL);

    if ($method === 'GET') {
        // Single by slug
        $slug = trim((string)($_GET['slug'] ?? ''));
        if ($slug !== '') {
            $stmt = $db->prepare("SELECT slug, title, summary, content_html, hero_image, published_at FROM posts WHERE slug = ? AND status = 'published' LIMIT 1");
            $stmt->execute([$slug]);
            $post = $stmt->fetch();
            if (!$post) {
                sendJsonResponse(null, 404, 'Post not found');
            }
            sendJsonResponse(['post' => $post]);
        }

        // List published
        $limit = (int)($_GET['limit'] ?? 20); $limit = max(1, min(100, $limit));
        $offset = (int)($_GET['offset'] ?? 0); $offset = max(0, $offset);
        $stmt = $db->prepare("SELECT slug, title, summary, hero_image, published_at FROM posts WHERE status = 'published' ORDER BY published_at DESC LIMIT $limit OFFSET $offset");
        $stmt->execute();
        $rows = $stmt->fetchAll();
        sendJsonResponse(['posts' => $rows, 'limit' => $limit, 'offset' => $offset]);
    }

    if ($method !== 'POST') {
        sendJsonResponse(null, 405, 'Method not allowed');
    }

    // CORS/Origin restriction for POST: only allow same-origin
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin) {
        $originHost = parse_url($origin, PHP_URL_HOST);
        $serverHost = $_SERVER['HTTP_HOST'] ?? '';
        if (!$serverHost || $originHost !== $serverHost) {
            sendJsonResponse(null, 403, 'Forbidden origin');
        }
    }

    // Auth: require valid session admin
    $isSessionAdmin = !empty($_SESSION['is_admin']);
    if (!$isSessionAdmin) {
        sendJsonResponse(null, 401, 'Unauthorized');
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') === false) {
        sendJsonResponse(null, 415, 'Unsupported Media Type: application/json required');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON');
    }

    $slug = strtolower(trim((string)($input['slug'] ?? '')));
    $title = trim((string)($input['title'] ?? ''));
    $summary = trim((string)($input['summary'] ?? ''));
    $content_html = (string)($input['content_html'] ?? '');
    $hero_image = trim((string)($input['hero_image'] ?? ''));
    $status = in_array(($input['status'] ?? 'published'), ['draft','published'], true) ? $input['status'] : 'published';
    $published_at = trim((string)($input['published_at'] ?? ''));

    if ($slug === '' || $title === '' || $content_html === '') {
        sendJsonResponse(['missing' => ['slug' => (bool)$slug, 'title' => (bool)$title, 'content_html' => (bool)$content_html]], 400, 'Missing required fields');
    }

    // Upsert by slug
    $existsStmt = $db->prepare("SELECT id FROM posts WHERE slug = ? LIMIT 1");
    $existsStmt->execute([$slug]);
    $exists = $existsStmt->fetchColumn();

    if ($exists) {
        $stmt = $db->prepare("UPDATE posts SET title = ?, summary = ?, content_html = ?, hero_image = ?, status = ?, published_at = COALESCE(TO_TIMESTAMP(NULLIF(?, ''), 'YYYY-MM-DD\"T\"HH24:MI:SS')::timestamptz, published_at), updated_at = NOW() WHERE slug = ? RETURNING slug");
        $stmt->execute([$title, $summary, $content_html, $hero_image, $status, $published_at, $slug]);
    } else {
        $stmt = $db->prepare("INSERT INTO posts (slug, title, summary, content_html, hero_image, status, published_at) VALUES (?, ?, ?, ?, ?, ?, COALESCE(TO_TIMESTAMP(NULLIF(?, ''), 'YYYY-MM-DD\"T\"HH24:MI:SS')::timestamptz, NOW())) RETURNING slug");
        $stmt->execute([$slug, $title, $summary, $content_html, $hero_image, $status, $published_at]);
    }

    // Audit log
    $actor = 'session_admin';
    $action = $exists ? 'update' : 'create';
    $audit = $db->prepare("INSERT INTO posts_audit (slug, action, actor, ip, user_agent) VALUES (?, ?, ?, ?, ?)");
    $audit->execute([$slug, $action, $actor, getClientIp(), $_SERVER['HTTP_USER_AGENT'] ?? '']);

    sendJsonResponse(['slug' => $slug], 200, 'Post saved');

} catch (PDOException $e) {
    logEvent('error', 'Posts API DB error', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'Database error');
} catch (Exception $e) {
    logEvent('error', 'Posts API error', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'Server error');
}
