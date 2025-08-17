<?php
/**
 * AI Safari Bot Chat Transcript API
 * Accepts transcript JSON, validates, formats, and emails to admins and visitor (if consented)
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/email.php';

// CORS and session/rate limit
setCorsHeaders();
checkRateLimit();
initSession();

// Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

// Optional API key validation (if provided)
$provided_key = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!empty($provided_key) && !validateApiKey($provided_key)) {
    sendJsonResponse(null, 401, 'Invalid API key');
}

// Log access
logEvent('info', 'Chat transcript endpoint hit', [ 'ua' => ($_SERVER['HTTP_USER_AGENT'] ?? '') ]);

try {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
        sendJsonResponse(null, 400, 'Invalid JSON');
    }

    // Extract and sanitize
    $visitor = isset($input['visitor']) && is_array($input['visitor']) ? $input['visitor'] : [];
    $name = isset($visitor['name']) ? sanitizeInput($visitor['name']) : '';
    $email = isset($visitor['email']) ? filter_var($visitor['email'], FILTER_SANITIZE_EMAIL) : '';
    $consent = !empty($visitor['consent']);

    $history = isset($input['history']) && is_array($input['history']) ? $input['history'] : [];
    $preferences = isset($input['preferences']) && is_array($input['preferences']) ? $input['preferences'] : [];
    $meta = isset($input['meta']) && is_array($input['meta']) ? $input['meta'] : [];

    // Minimal validation
    if (empty($history)) {
        sendJsonResponse(null, 400, 'Transcript history required');
    }

    // Build summary (first user message + last bot message if available)
    $firstUser = null; $lastBot = null; $userCount = 0; $botCount = 0;
    foreach ($history as $m) {
        if (!is_array($m)) continue;
        $sender = strtolower($m['sender'] ?? '');
        if ($sender === 'user') { $userCount++; if ($firstUser === null) $firstUser = $m['message'] ?? ''; }
        if ($sender === 'bot') { $botCount++; $lastBot = $m['message'] ?? $lastBot; }
    }
    $summary = trim((string)($firstUser ?? ''));
    if ($summary !== '' && strlen($summary) > 120) { $summary = substr($summary, 0, 117) . '...'; }

    // Build HTML transcript
    $sessionStart = isset($input['sessionStart']) ? htmlspecialchars($input['sessionStart']) : date('c');
    $sessionEnd = isset($input['sessionEnd']) ? htmlspecialchars($input['sessionEnd']) : date('c');
    $page = htmlspecialchars($meta['page'] ?? ($_SERVER['HTTP_REFERER'] ?? ''));
    $ua = htmlspecialchars($_SERVER['HTTP_USER_AGENT'] ?? '');
    $ip = htmlspecialchars(getClientIp());

    $rows = '';
    foreach ($history as $m) {
        if (!is_array($m)) continue;
        $sender = htmlspecialchars((string)($m['sender'] ?? ''));
        $msg = $m['message'] ?? '';
        // Allow basic HTML for bot messages already sanitized upstream; still escape
        $msgSafe = nl2br(htmlspecialchars((string)$msg));
        $ts = htmlspecialchars((string)($m['timestamp'] ?? ''));
        $rows .= "<tr><td style='padding:8px;border-bottom:1px solid #eee;width:90px;font-weight:bold;'>$sender</td><td style='padding:8px;border-bottom:1px solid #eee;'>$msgSafe<br><small style='color:#777;'>$ts</small></td></tr>";
    }

    $prefHtml = '';
    if (!empty($preferences)) {
        $prefHtml .= "<ul style='margin:0;padding-left:18px;'>";
        foreach ($preferences as $k => $v) {
            if (is_array($v)) $v = implode(', ', $v);
            $prefHtml .= "<li><strong>" . htmlspecialchars((string)$k) . ":</strong> " . htmlspecialchars((string)$v) . "</li>";
        }
        $prefHtml .= "</ul>";
    } else {
        $prefHtml = '<em>No explicit preferences captured.</em>';
    }

    $visitorBlock = "<p><strong>Name:</strong> " . ($name !== '' ? htmlspecialchars($name) : 'Anonymous') . "<br><strong>Email:</strong> " . ($email !== '' ? htmlspecialchars($email) : 'Not provided') . "<br><strong>Consent to email:</strong> " . ($consent ? 'Yes' : 'No') . "</p>";

    $html = "<html><body style='font-family:Arial,sans-serif;color:#333;'>
        <h2 style='color:#2E7D32;margin:0 0 10px 0;'>AI Safari Chat Transcript</h2>
        <p style='margin:0 0 16px 0;'>Session: <strong>$sessionStart</strong> → <strong>$sessionEnd</strong></p>
        <div style='background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:12px;margin-bottom:12px;'>
            <h3 style='margin:0 0 8px 0;'>Visitor</h3>
            $visitorBlock
        </div>
        <div style='background:#eef7f0;border:1px solid #d9efe0;border-radius:8px;padding:12px;margin-bottom:12px;'>
            <h3 style='margin:0 0 8px 0;'>Preferences</h3>
            $prefHtml
        </div>
        <div style='background:#fff;border:1px solid #eee;border-radius:8px;padding:0;margin:0 0 12px 0;'>
            <table style='width:100%;border-collapse:collapse;'>$rows</table>
        </div>
        <div style='background:#e9f2fb;border:1px solid #cfe5ff;border-radius:8px;padding:12px;'>
            <h3 style='margin:0 0 8px 0;'>Context</h3>
            <p style='margin:0;'><strong>Page:</strong> $page<br><strong>User-Agent:</strong> $ua<br><strong>IP:</strong> $ip</p>
        </div>
        <p style='color:#666;font-size:12px;margin-top:16px;'>&copy; " . date('Y') . " Gisu Safaris</p>
    </body></html>";

    $subject = 'AI Safari Chat Transcript - ' . ($name !== '' ? $name : 'Visitor') . ($summary !== '' ? (' - ' . $summary) : '');

    // Send to admins
    $adminSent = false;
    try {
        $adminSent = sendMultipleAdminEmails($subject, $html);
    } catch (Exception $e) {
        logEvent('error', 'Failed to send admin transcript emails', [ 'error' => $e->getMessage() ]);
    }

    // CC visitor if consent and email valid
    $visitorSent = false;
    if ($consent && !empty($email) && isValidEmail($email)) {
        try {
            sendEmail($email, $name, 'Your Safari Chat Transcript', $html);
            $visitorSent = true;
        } catch (Exception $e) {
            logEvent('warning', 'Failed to email transcript to visitor', [ 'email' => $email, 'error' => $e->getMessage() ]);
        }
    }

    logEvent('info', 'Transcript processed', [
        'admin_sent' => $adminSent,
        'visitor_sent' => $visitorSent,
        'messages' => count($history),
        'user_msgs' => $userCount,
        'bot_msgs' => $botCount,
        'page' => $page,
    ]);

    sendJsonResponse([
        'admin_sent' => $adminSent,
        'visitor_sent' => $visitorSent
    ], 200, 'Transcript received');

} catch (Exception $e) {
    logEvent('error', 'Transcript endpoint error', [ 'error' => $e->getMessage() ]);
    sendJsonResponse(null, 500, 'Server error');
}
