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
    $metadata = is_array($input['metadata'] ?? null) ? $input['metadata'] : [];
    $first = sanitizeInput($customer['first_name'] ?? 'Guest');
    $last = sanitizeInput($customer['last_name'] ?? '');
    $email = filter_var($customer['email'] ?? '', FILTER_SANITIZE_EMAIL);

    if (empty($email)) {
        sendJsonResponse(null, 400, 'customer.email is required');
    }

    // Local helpers
    $nameOk = function(string $v): bool {
        $v = trim($v);
        if ($v === '' || strlen($v) < 2 || strlen($v) > 60) return false;
        if (!preg_match("/^[A-Za-z'\-\s]+$/", $v)) return false;
        if (preg_match('/[0-9]/', $v)) return false;
        if (preg_match('/(?:[^AEIOUaeiou\W]){4,}/', $v)) return false; // 4+ consonants
        return (bool)preg_match('/[AEIOUaeiou]/', $v);
    };
    $emailLocalOk = function(string $em): bool {
        if (!isValidEmail($em)) return false;
        $parts = explode('@', $em);
        if (count($parts) < 2) return false;
        $local = $parts[0];
        if (preg_match('/^[A-Za-z]+$/', $local)) {
            $vowelCount = preg_match_all('/[AEIOUaeiou]/', $local);
            if ($vowelCount < 3) return false;
            if (preg_match('/(?:[^AEIOUaeiou]){3,}/', $local)) return false;
        }
        return true;
    };

    if ($first && !$nameOk($first)) {
        sendJsonResponse(null, 400, 'Invalid first name');
    }
    if ($last && !$nameOk($last)) {
        sendJsonResponse(null, 400, 'Invalid last name');
    }
    if (!$emailLocalOk($email)) {
        sendJsonResponse(null, 400, 'Invalid email');
    }

    // Nationality and passport are required via metadata
    $nationality = sanitizeInput((string)($metadata['nationality'] ?? ''));
    $passport = strtoupper(preg_replace('/\s+/', '', sanitizeInput((string)($metadata['passport'] ?? ''))));

    $natOk = function(string $v): bool {
        $v = trim($v);
        if ($v === '' || strlen($v) < 2 || strlen($v) > 56) return false;
        if (!preg_match("/^[A-Za-z\s\-']+$/", $v)) return false;
        if (preg_match('/(?:[^AEIOUaeiou\W]){4,}/', $v)) return false;
        return true;
    };
    $normCountry = function(string $c): string {
        $u = strtoupper(trim($c));
        $map = [ 'US' => 'USA','USA' => 'USA','UNITED STATES' => 'USA', 'UK' => 'UK','GB' => 'UK','GBR' => 'UK','UNITED KINGDOM' => 'UK', 'CANADA' => 'CANADA','CA' => 'CANADA','CAN' => 'CANADA', 'INDIA' => 'INDIA','IN' => 'INDIA','IND' => 'INDIA' ];
        return $map[$u] ?? $c;
    };
    $passOk = function(string $p, string $nat) use ($normCountry): bool {
        $p = strtoupper(trim($p));
        if (!preg_match('/^[A-Z0-9]{8,9}$/', $p)) return false;
        $natN = $normCountry($nat);
        $patterns = [
            'USA' => '/^[0-9]{9}$/',
            'UK' => '/^[0-9]{9}$/',
            'CANADA' => '/^[A-Z]{2}[0-9]{6}$/',
            'INDIA' => '/^[A-Z][0-9]{7}$/',
        ];
        if (isset($patterns[$natN])) return (bool)preg_match($patterns[$natN], $p);
        return true;
    };

    if (empty($nationality)) {
        logEvent('warning', 'validation_failed', ['endpoint' => 'payments_placeholder', 'field' => 'nationality', 'reason' => 'missing']);
        sendJsonResponse(null, 400, 'Nationality is required');
    }
    if (!$natOk($nationality)) {
        logEvent('warning', 'validation_failed', ['endpoint' => 'payments_placeholder', 'field' => 'nationality', 'reason' => 'format_or_gibberish']);
        sendJsonResponse(null, 400, 'Invalid nationality');
    }
    if (empty($passport)) {
        logEvent('warning', 'validation_failed', ['endpoint' => 'payments_placeholder', 'field' => 'passport', 'reason' => 'missing']);
        sendJsonResponse(null, 400, 'Passport is required');
    }
    if (!$passOk($passport, $nationality)) {
        logEvent('warning', 'validation_failed', ['endpoint' => 'payments_placeholder', 'field' => 'passport', 'reason' => 'pattern_mismatch', 'nationality' => $nationality]);
        sendJsonResponse(null, 400, 'Invalid passport number');
    }

    $db = getDbConnection();
    // Ensure nationality & passport columns exist (idempotent)
    try {
        $db->exec("ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);");
        $db->exec("ALTER TABLE package_bookings ADD COLUMN IF NOT EXISTS passport VARCHAR(20);");
    } catch (Exception $e) {
        logEvent('warning', 'package_bookings alter table failed or skipped', ['error' => $e->getMessage()]);
    }

    $stmt = $db->prepare("INSERT INTO package_bookings (package_type, first_name, last_name, email, group_size, accommodation_level, special_requests, add_ons, estimated_price, booking_status, payment_status, ip_address, user_agent, nationality, passport) VALUES (:ptype, :first, :last, :email, :gsize, NULL, NULL, NULL, :est, 'inquiry', 'pending', :ip, :ua, :nat, :pp) RETURNING id");
    $stmt->execute([
        ':ptype' => $packageType,
        ':first' => $first,
        ':last' => $last,
        ':email' => $email,
        ':gsize' => $groupSize,
        ':est' => $estimated,
        ':ip' => getClientIp(),
        ':ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ':nat' => $nationality,
        ':pp' => $passport,
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
