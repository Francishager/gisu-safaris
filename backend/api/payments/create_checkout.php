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

    if (empty(PESAPAL_CONSUMER_KEY) || empty(PESAPAL_CONSUMER_SECRET)) {
        logEvent('error', 'PesaPal consumer key/secret missing');
        sendJsonResponse(null, 500, 'PesaPal not configured');
    }

    // PesaPal uses decimal amounts; keep original amount
    $successUrl = PESAPAL_CALLBACK_URL . '?bookingId=' . urlencode($bookingId);

    // Obtain PesaPal access token
    $token = getPesapalAccessToken();

    // Basic split of customer name for billing details
    $firstName = '';
    $lastName = '';
    if ($custName !== '') {
        $parts = preg_split('/\s+/', $custName);
        $firstName = $parts[0] ?? '';
        if (count($parts) > 1) {
            array_shift($parts);
            $lastName = trim(implode(' ', $parts));
        }
    }

    $billingPhone = '';
    if (!empty($metadata['phone'])) {
        $billingPhone = (string)$metadata['phone'];
    }

    $order = [
        'id' => (string)$bookingId,
        'currency' => $currency,
        'amount' => $amount,
        'description' => $title,
        'callback_url' => $successUrl,
        'notification_id' => PESAPAL_NOTIFICATION_ID,
        'billing_address' => [
            'email_address' => $custEmail,
            'phone_number' => $billingPhone,
            'country_code' => 'UG',
            'first_name' => $firstName,
            'middle_name' => '',
            'last_name' => $lastName,
            'line_1' => '',
            'line_2' => '',
            'city' => '',
            'state' => '',
            'postal_code' => '',
        ],
    ];

    $ch = curl_init(rtrim(PESAPAL_API_BASE, '/') . '/Transactions/SubmitOrderRequest');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Accept: application/json',
        'Authorization: Bearer ' . $token,
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($order));

    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        logEvent('error', 'PesaPal API curl error', ['error' => $err]);
        sendJsonResponse(null, 502, 'PesaPal request failed');
    }
    curl_close($ch);

    $pesapal = json_decode($resp, true);
    if ($httpCode >= 400 || empty($pesapal['order_tracking_id']) || empty($pesapal['redirect_url'])) {
        logEvent('error', 'PesaPal API error', ['status' => $httpCode, 'body' => $pesapal]);
        sendJsonResponse(null, 502, 'Failed to create checkout session');
    }

    $sessionId = $pesapal['order_tracking_id'];
    $checkoutUrl = $pesapal['redirect_url'];

    // Persist pending payment record
    try {
        $db = getDbConnection();
        // Payments table (generic) - reuse stripe_session_id to store PesaPal order tracking ID
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
        // Best-effort update (bookingId assumed to be ID of package_bookings)
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
