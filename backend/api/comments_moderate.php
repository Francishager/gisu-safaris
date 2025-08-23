<?php
/**
 * Comments Moderation API
 * - Secure approve/reject of comments
 * - List comments by status (e.g., pending)
 * Auth: requires X-API-Key header or api_key query that matches API_KEY
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';

setCorsHeaders();
setSecurityHeaders();
initSession();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['api_key'] ?? '');
if (!validateApiKey($apiKey)) {
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
        if ($q !== '')      { $where[] = '(comment ILIKE ? OR name ILIKE ? OR email ILIKE ?)'; array_push($params, "%$q%", "%$q%", "%$q%"); }
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

    $stmt = $db->prepare("UPDATE comments SET status = ?, updated_at = NOW() WHERE id = ? RETURNING id, page_path, name, email, comment, status");
    $stmt->execute([$newStatus, $id]);
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
