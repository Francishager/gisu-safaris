<?php
// Create a minimal placeholder booking and return its UUID
// POST JSON: { package_type, title?, customer: { first_name?, last_name?, email }, group_size?, estimated_price? }

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/email.php';

setCorsHeaders();
checkRateLimit();
initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

try {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        sendJsonResponse(null, 400, 'Invalid JSON');
    }

    $packageType = trim((string)($input['package_type'] ?? 'custom'));
    $title = trim((string)($input['title'] ?? ''));
    $groupSize = (int)($input['group_size'] ?? 1);
    $estimated = isset($input['estimated_price']) ? (float)$input['estimated_price'] : null;

    $customer = is_array($input['customer'] ?? null) ? $input['customer'] : [];
    $first = sanitizeInput($customer['first_name'] ?? 'Guest');
    $last = sanitizeInput($customer['last_name'] ?? '');
    $email = filter_var($customer['email'] ?? '', FILTER_SANITIZE_EMAIL);

    if (empty($email)) {
        sendJsonResponse(null, 400, 'customer.email is required');
    }

    $db = getDbConnection();
    $stmt = $db->prepare("INSERT INTO package_bookings (package_type, first_name, last_name, email, group_size, accommodation_level, special_requests, add_ons, estimated_price, booking_status, payment_status, ip_address, user_agent) VALUES (:ptype, :first, :last, :email, :gsize, NULL, NULL, NULL, :est, 'inquiry', 'pending', :ip, :ua) RETURNING id");
    $stmt->execute([
        ':ptype' => $packageType,
        ':first' => $first,
        ':last' => $last,
        ':email' => $email,
        ':gsize' => $groupSize,
        ':est' => $estimated,
        ':ip' => getClientIp(),
        ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
    ]);

    $bookingId = $stmt->fetchColumn();
    if (!$bookingId) {
        sendJsonResponse(null, 500, 'Failed to create booking');
    }

    sendJsonResponse(['bookingId' => $bookingId, 'package_type' => $packageType, 'title' => $title]);

} catch (Exception $e) {
    logEvent('error', 'create_placeholder_booking error', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'Server error');
}
