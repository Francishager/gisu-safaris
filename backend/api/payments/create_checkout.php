<?php
// Stripe Checkout Session Creator
// POST JSON: { bookingId, bookingType, title, amount, currency?, deposit?, customer: { name, email }, metadata? }

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/email.php';

setCorsHeaders();
checkRateLimit();
initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

if (empty(STRIPE_SECRET_KEY)) {
    logEvent('error', 'Stripe secret key missing');
    sendJsonResponse(null, 500, 'Stripe not configured');
}

try {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        sendJsonResponse(null, 400, 'Invalid JSON');
    }

    $bookingId = $input['bookingId'] ?? null;
    $bookingType = $input['bookingType'] ?? 'safari';
    $title = trim((string)($input['title'] ?? 'Gisu Safaris Booking'));
    $amount = (float)($input['amount'] ?? 0);
    $currency = strtoupper($input['currency'] ?? PAYMENTS_CURRENCY);
    $deposit = !empty($input['deposit']);
    $customer = is_array($input['customer'] ?? null) ? $input['customer'] : [];
    $custName = sanitizeInput($customer['name'] ?? '');
    $custEmail = filter_var($customer['email'] ?? '', FILTER_SANITIZE_EMAIL);
    $metadata = is_array($input['metadata'] ?? null) ? $input['metadata'] : [];

    if (empty($bookingId) || $amount <= 0 || empty($custEmail)) {
        sendJsonResponse(null, 400, 'bookingId, amount, and customer.email are required');
    }

    // Local helpers for validation
    $nameOk = function(string $v): bool {
        $v = trim($v);
        if ($v === '' || strlen($v) < 2 || strlen($v) > 60) return false;
        if (!preg_match("/^[A-Za-z'\-\s]+$/", $v)) return false;
        if (preg_match('/[0-9]/', $v)) return false;
        if (preg_match('/(?:[^AEIOUaeiou\W]){4,}/', $v)) return false; // 4+ consonants
        return (bool)preg_match('/[AEIOUaeiou]/', $v);
    };
    $emailLocalOk = function(string $email): bool {
        $parts = explode('@', $email);
        if (count($parts) < 2) return false;
        $local = $parts[0];
        if (preg_match('/^[A-Za-z]+$/', $local)) {
            $vowelCount = preg_match_all('/[AEIOUaeiou]/', $local);
            if ($vowelCount < 3) return false;
            if (preg_match('/(?:[^AEIOUaeiou]){3,}/', $local)) return false;
        }
        return true;
    };

    if (!$nameOk($custName)) {
        sendJsonResponse(null, 400, 'Invalid customer name');
    }
    if (!isValidEmail($custEmail) || !$emailLocalOk($custEmail)) {
        sendJsonResponse(null, 400, 'Invalid customer email');
    }

    // Require nationality and passport in metadata
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
        logEvent('warning', 'validation_failed', ['endpoint' => 'payments_checkout', 'field' => 'nationality', 'reason' => 'missing']);
        sendJsonResponse(null, 400, 'Nationality is required');
    }
    if (!$natOk($nationality)) {
        logEvent('warning', 'validation_failed', ['endpoint' => 'payments_checkout', 'field' => 'nationality', 'reason' => 'format_or_gibberish']);
        sendJsonResponse(null, 400, 'Invalid nationality');
    }
    if (empty($passport)) {
        logEvent('warning', 'validation_failed', ['endpoint' => 'payments_checkout', 'field' => 'passport', 'reason' => 'missing']);
        sendJsonResponse(null, 400, 'Passport is required');
    }
    if (!$passOk($passport, $nationality)) {
        logEvent('warning', 'validation_failed', ['endpoint' => 'payments_checkout', 'field' => 'passport', 'reason' => 'pattern_mismatch', 'nationality' => $nationality]);
        sendJsonResponse(null, 400, 'Invalid passport number');
    }

    // Convert amount to cents (Stripe requires integer amount in the smallest currency unit)
    $amountCents = (int)round($amount * 100);

    $successUrl = PAYMENTS_SUCCESS_URL . '?bookingId=' . urlencode($bookingId);
    $cancelUrl = PAYMENTS_CANCEL_URL . '?bookingId=' . urlencode($bookingId);

    // Prepare Stripe Checkout Session payload (x-www-form-urlencoded)
    $postFields = [
        'mode' => 'payment',
        'success_url' => $successUrl,
        'cancel_url' => $cancelUrl,
        'client_reference_id' => (string)$bookingId,
        'customer_email' => $custEmail,
        'line_items[0][price_data][currency]' => $currency,
        'line_items[0][price_data][product_data][name]' => $title,
        'line_items[0][price_data][unit_amount]' => $amountCents,
        'line_items[0][quantity]' => 1,
        'metadata[booking_id]' => (string)$bookingId,
        'metadata[booking_type]' => (string)$bookingType,
        'metadata[deposit]' => $deposit ? 'true' : 'false',
        'metadata[customer_name]' => $custName,
    ];

    // Include any additional metadata keys
    foreach ($metadata as $k => $v) {
        $postFields['metadata[' . $k . ']'] = (string)$v;
    }

    // Call Stripe API
    $ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . STRIPE_SECRET_KEY,
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));

    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        logEvent('error', 'Stripe API curl error', ['error' => $err]);
        sendJsonResponse(null, 502, 'Stripe request failed');
    }
    curl_close($ch);

    $stripe = json_decode($resp, true);
    if ($httpCode >= 400 || empty($stripe['id']) || empty($stripe['url'])) {
        logEvent('error', 'Stripe API error', ['status' => $httpCode, 'body' => $stripe]);
        sendJsonResponse(null, 502, 'Failed to create checkout session');
    }

    $sessionId = $stripe['id'];
    $checkoutUrl = $stripe['url'];

    // Persist pending payment record
    try {
        $db = getDbConnection();
        // Payments table (generic)
        $pstmt = $db->prepare("INSERT INTO payments (booking_id, booking_type, amount, currency, status, stripe_session_id, customer_email, metadata) VALUES (:bid, :btype, :amount, :currency, :status, :sid, :email, :meta)");
        $pstmt->execute([
            ':bid' => $bookingId,
            ':btype' => $bookingType,
            ':amount' => $amount,
            ':currency' => $currency,
            ':status' => 'pending',
            ':sid' => $sessionId,
            ':email' => $custEmail,
            ':meta' => json_encode($metadata)
        ]);

        // If this relates to a package booking, store refs for convenience
        // Best-effort update (bookingId assumed to be UUID of package_bookings)
        try {
            $bstmt = $db->prepare("UPDATE package_bookings SET stripe_session_id = :sid, payment_status = 'pending' WHERE id = :bid");
            $bstmt->execute([':sid' => $sessionId, ':bid' => $bookingId]);
        } catch (Exception $e) { /* ignore */ }
    } catch (Exception $e) {
        logEvent('warning', 'Failed to persist pending payment', ['error' => $e->getMessage()]);
    }

    sendJsonResponse(['sessionId' => $sessionId, 'url' => $checkoutUrl]);

} catch (Exception $e) {
    logEvent('error', 'create_checkout exception', ['error' => $e->getMessage()]);
    sendJsonResponse(null, 500, 'Server error');
}
