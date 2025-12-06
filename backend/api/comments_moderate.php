<?php
/**
 * Comments Moderation API
 * - Secure approve/reject of comments
 * - List comments by status (e.g., pending)
 * Auth: requires admin session or valid API key (X-API-Key header or api_key query that matches API_KEY)
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';

setCorsHeaders();
setSecurityHeaders();
initSession();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Allow either logged-in admin session or a valid API key
$isAdmin = !empty($_SESSION['is_admin']);
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['api_key'] ?? '');
if (!$isAdmin && !validateApiKey($apiKey)) {
    sendJsonResponse(null, 401, 'Unauthorized: invalid API key');
}

try {
    $db = getDbConnection();

    if ($method === 'GET') {
        // List comments by status and page
        $status = strtolower(trim((string)($_GET['status'] ?? 'pending')));
        $page = sanitizeInput($_GET['page'] ?? '');
        $limit = (int)($_GET['limit'] ?? 50);
        $limit = max(1, min(200, $limit));
        $q = trim((string)($_GET['q'] ?? ''));

        $where = [];
        $params = [];
        if ($status !== '') { $where[] = 'status = ?'; $params[] = $status; }
        if ($page !== '')   { $where[] = 'page_path = ?'; $params[] = $page; }
        if ($q !== '')      { $where[] = '(comment LIKE ? OR name LIKE ? OR email LIKE ?)'; array_push($params, "%$q%", "%$q%", "%$q%"); }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

        $stmt = $db->prepare("SELECT id, page_path, name, email, comment, consent, status, created_at FROM comments $whereSql ORDER BY created_at DESC LIMIT $limit");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        sendJsonResponse(['comments' => $rows], 200, 'Comments list');
    }

    if ($method !== 'POST') {
        sendJsonResponse(null, 405, 'Method not allowed');
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') === false) {
        sendJsonResponse(null, 415, 'Unsupported Media Type: application/json required');
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON');
    }

    $id = $input['id'] ?? '';
    $action = strtolower(trim((string)($input['action'] ?? '')));
    if (!$id || !in_array($action, ['approve','reject'], true)) {
        sendJsonResponse(null, 400, 'Missing id or invalid action');
    }

    $newStatus = $action === 'approve' ? 'approved' : 'rejected';

    // Update comment status, then fetch updated row (MySQL-compatible; no RETURNING)
    $stmt = $db->prepare("UPDATE comments SET status = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$newStatus, $id]);

    $stmt = $db->prepare("SELECT id, page_path, name, email, comment, status FROM comments WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        sendJsonResponse(null, 404, 'Comment not found');
    }

    logEvent('info', 'Comment moderated', ['id' => $id, 'status' => $newStatus]);
    sendJsonResponse(['comment' => $row], 200, 'Comment updated');

} catch (PDOException $e) {
    logEvent('error', 'Moderation DB error', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'Database error');
} catch (Exception $e) {
    logEvent('error', 'Moderation error', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'Server error');
}
