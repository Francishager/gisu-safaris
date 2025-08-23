<?php
/**
 * Admin Auth API (email/password with hashed passwords)
 * - POST action=login { email, password }
 * - POST action=logout
 * - GET  me
 * - POST action=bootstrap { email, password }  -- only if no admins exist, requires X-API-Key
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';

setCorsHeaders();
setSecurityHeaders();
initSession();
checkRateLimit();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// DB and auto-migration for admins table
try {
    $db = getDbConnection();
    $db->exec(<<<SQL
        CREATE TABLE IF NOT EXISTS admins (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email CITEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
SQL);
    $db->exec("CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);");
} catch (Exception $e) {
    logEvent('error', 'Admin auth migration error', ['error' => $e->getMessage()]);
}

try {
    if ($method === 'GET') {
        $me = [
            'is_admin' => !empty($_SESSION['is_admin']),
            'email' => $_SESSION['admin_email'] ?? null
        ];
        sendJsonResponse(['me' => $me]);
    }

    if ($method !== 'POST') {
        sendJsonResponse(null, 405, 'Method not allowed');
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $input = [];
    if (stripos($contentType, 'application/json') !== false) {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
    } else {
        // also allow form-urlencoded
        $input = $_POST;
    }

    $action = strtolower(trim((string)($input['action'] ?? '')));

    if ($action === 'login') {
        $email = strtolower(trim((string)($input['email'] ?? '')));
        $password = (string)($input['password'] ?? '');
        if ($email === '' || $password === '') {
            sendJsonResponse(null, 400, 'Email and password required');
        }
        $stmt = $db->prepare('SELECT email, password_hash FROM admins WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $row = $stmt->fetch();
        if (!$row || !password_verify($password, $row['password_hash'])) {
            sendJsonResponse(null, 401, 'Invalid email or password');
        }
        $_SESSION['is_admin'] = true;
        $_SESSION['admin_email'] = $row['email'];
        sendJsonResponse(['ok' => true], 200, 'Logged in');
    }

    if ($action === 'logout') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'], $params['secure'], $params['httponly']
            );
        }
        session_destroy();
        sendJsonResponse(['ok' => true], 200, 'Logged out');
    }

    if ($action === 'bootstrap') {
        // Allow creating the first admin only if none exists, require API key for bootstrap
        $count = (int)$db->query('SELECT COUNT(*) FROM admins')->fetchColumn();
        if ($count > 0) {
            sendJsonResponse(null, 400, 'Admins already exist');
        }
        $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
        if (!validateApiKey($apiKey)) {
            sendJsonResponse(null, 401, 'Unauthorized');
        }
        $email = strtolower(trim((string)($input['email'] ?? '')));
        $password = (string)($input['password'] ?? '');
        if (!isValidEmail($email) || strlen($password) < 8) {
            sendJsonResponse(null, 400, 'Invalid email or password too short');
        }
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $ins = $db->prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)');
        $ins->execute([$email, $hash]);
        sendJsonResponse(['ok' => true], 200, 'Admin created');
    }

    sendJsonResponse(null, 400, 'Unknown action');

} catch (Exception $e) {
    logEvent('error', 'Auth API error', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'Server error');
}
