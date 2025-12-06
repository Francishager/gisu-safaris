<?php

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';

setCorsHeaders();
setSecurityHeaders();
checkRateLimit();
initSession();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

if (empty($_SESSION['is_admin'])) {
    sendJsonResponse(null, 401, 'Unauthorized');
}

try {
    $db = getDbConnection();

    $limit = (int)($_GET['limit'] ?? 50);
    $limit = max(1, min(100, $limit));
    $onlyLeads = (int)($_GET['only_leads'] ?? 0) === 1;
    $search = trim((string)($_GET['q'] ?? ''));

    $sql = "SELECT cm.id, cm.session_id, cm.message AS user_message, cm.occurred_at, cm.created_at,
                   cs.visitor_email, cs.page, cs.lead_score, cs.booking_intent
            FROM chat_messages cm
            JOIN chat_sessions cs ON cs.session_id = cm.session_id
            WHERE cm.sender = 'user'";

    $params = [];

    if ($onlyLeads) {
        $sql .= " AND (cs.booking_intent = 1 OR cs.lead_score >= 70)";
    }

    if ($search !== '') {
        $sql .= " AND (cm.message LIKE :s OR cs.page LIKE :s OR cs.visitor_email LIKE :s)";
        $params[':s'] = '%' . $search . '%';
    }

    $maxCandidates = max($limit * 2, 50);
    $sql .= " ORDER BY cm.created_at DESC LIMIT :lim";

    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, PDO::PARAM_STR);
    }
    $stmt->bindValue(':lim', $maxCandidates, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $items = [];
    foreach ($rows as $row) {
        if (count($items) >= $limit) break;
        $sid = $row['session_id'];
        $t = $row['occurred_at'] ?: $row['created_at'];

        $stmt2 = $db->prepare("SELECT message, occurred_at, created_at
                               FROM chat_messages
                               WHERE session_id = :sid AND sender = 'bot' AND COALESCE(occurred_at, created_at) > :t
                               ORDER BY COALESCE(occurred_at, created_at) ASC
                               LIMIT 1");
        $stmt2->execute([
            ':sid' => $sid,
            ':t' => $t,
        ]);
        $ans = $stmt2->fetch(PDO::FETCH_ASSOC);
        if (!$ans) continue;

        $items[] = [
            'id' => (int)$row['id'],
            'session_id' => $sid,
            'asked_at' => $t,
            'user_message' => $row['user_message'],
            'bot_answer' => $ans['message'],
            'visitor_email' => $row['visitor_email'],
            'page' => $row['page'],
            'lead_score' => isset($row['lead_score']) ? (int)$row['lead_score'] : null,
            'booking_intent' => !empty($row['booking_intent']),
        ];
    }

    sendJsonResponse(['items' => $items], 200, 'OK');

} catch (Exception $e) {
    logEvent('error', 'ai_faq_admin failure', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'Server error');
}
