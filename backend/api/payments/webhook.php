<?php
// Stripe Webhook Handler
// Handles events: checkout.session.completed (primary)

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../includes/email.php';

// No CORS for webhooks; respond fast

function badRequest($msg = 'Bad Request', $code = 400) {
    http_response_code($code);
    echo $msg;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    badRequest('Method not allowed', 405);
}

$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
if (empty(STRIPE_WEBHOOK_SECRET)) {
    logEvent('error', 'Stripe webhook secret missing');
    badRequest('Not configured', 500);
}

// Minimal signature verification (Stripe-Signature: t=timestamp,v1=signature,...)
function verifyStripeSignature($payload, $sigHeader, $secret, $tolerance = 300) {
    $parts = [];
    foreach (explode(',', $sigHeader) as $kv) {
        $pair = explode('=', trim($kv), 2);
        if (count($pair) === 2) { $parts[$pair[0]] = $pair[1]; }
    }
    if (empty($parts['t']) || empty($parts['v1'])) return false;
    $timestamp = (int)$parts['t'];
    if (abs(time() - $timestamp) > $tolerance) return false;
    $signedPayload = $timestamp . '.' . $payload;
    $computed = hash_hmac('sha256', $signedPayload, $secret);
    // Constant-time comparison
    if (function_exists('hash_equals')) {
        return hash_equals($computed, $parts['v1']);
    }
    return $computed === $parts['v1'];
}

if (!verifyStripeSignature($payload, $signature, STRIPE_WEBHOOK_SECRET)) {
    logEvent('warning', 'Invalid Stripe signature');
    badRequest('Invalid signature', 400);
}

$event = json_decode($payload, true);
if (!is_array($event) || empty($event['type'])) {
    badRequest('Invalid payload', 400);
}

$type = $event['type'];

try {
    if ($type === 'checkout.session.completed') {
        $session = $event['data']['object'] ?? [];
        $sessionId = $session['id'] ?? null;
        $bookingId = $session['client_reference_id'] ?? null;
        $amountTotal = isset($session['amount_total']) ? (int)$session['amount_total'] : null; // in cents
        $currency = strtoupper($session['currency'] ?? PAYMENTS_CURRENCY);
        $paymentIntentId = $session['payment_intent'] ?? null;
        $customerEmail = $session['customer_details']['email'] ?? ($session['customer_email'] ?? null);
        $metadata = $session['metadata'] ?? [];
        $isDeposit = isset($metadata['deposit']) && ($metadata['deposit'] === 'true' || $metadata['deposit'] === true);

        $amount = $amountTotal !== null ? round($amountTotal / 100, 2) : null;

        // Attempt to fetch receipt_url from latest charge via PaymentIntent (optional best effort)
        $receiptUrl = null;
        if (!empty($paymentIntentId) && !empty(STRIPE_SECRET_KEY)) {
            $ch = curl_init('https://api.stripe.com/v1/payment_intents/' . urlencode($paymentIntentId));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . STRIPE_SECRET_KEY]);
            $piResp = curl_exec($ch);
            $piHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($piResp && $piHttp < 400) {
                $pi = json_decode($piResp, true);
                $chargeId = $pi['charges']['data'][0]['id'] ?? null;
                if ($chargeId) {
                    $ch2 = curl_init('https://api.stripe.com/v1/charges/' . urlencode($chargeId));
                    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . STRIPE_SECRET_KEY]);
                    $cResp = curl_exec($ch2);
                    $cHttp = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
                    curl_close($ch2);
                    if ($cResp && $cHttp < 400) {
                        $c = json_decode($cResp, true);
                        $receiptUrl = $c['receipt_url'] ?? null;
                    }
                }
            }
        }

        $db = getDbConnection();
        $db->beginTransaction();

        // Update payments table (generic)
        $pstmt = $db->prepare("UPDATE payments SET status = :status, stripe_payment_intent_id = :pi, currency = :currency, amount = COALESCE(:amt, amount), receipt_url = :receipt, customer_email = COALESCE(:email, customer_email), updated_at = NOW() WHERE stripe_session_id = :sid");
        $pstmt->execute([
            ':status' => 'succeeded',
            ':pi' => $paymentIntentId,
            ':currency' => $currency,
            ':amt' => $amount,
            ':receipt' => $receiptUrl,
            ':email' => $customerEmail,
            ':sid' => $sessionId,
        ]);

        // Update package booking if exists
        if (!empty($bookingId)) {
            // Determine new payment_status and fields
            $paidStatus = $isDeposit ? 'partial' : 'paid';
            $bstmt = $db->prepare("UPDATE package_bookings SET payment_status = :pstatus, paid_amount = COALESCE(paid_amount, 0) + COALESCE(:amt, 0), paid_at = NOW(), stripe_payment_intent_id = :pi WHERE id = :bid");
            $bstmt->execute([
                ':pstatus' => $paidStatus,
                ':amt' => $amount,
                ':pi' => $paymentIntentId,
                ':bid' => $bookingId,
            ]);
        }

        $db->commit();

        // Notify admins and booking notifications
        $subject = 'Payment received - ' . ($metadata['booking_type'] ?? 'booking');
        $html = '<h2>Payment Received</h2>' .
                '<p>Booking ID: ' . htmlspecialchars((string)$bookingId) . '</p>' .
                '<p>Amount: ' . htmlspecialchars((string)$amount) . ' ' . htmlspecialchars($currency) . '</p>' .
                '<p>Status: succeeded</p>' .
                (!empty($receiptUrl) ? ('<p><a href="' . htmlspecialchars($receiptUrl) . '" target="_blank">View receipt</a></p>') : '') .
                '<p>Payment Intent: ' . htmlspecialchars((string)$paymentIntentId) . '</p>';

        foreach (ADMIN_EMAIL_LIST as $adminEmail) {
            sendEmail($adminEmail, 'Payments', $subject, $html);
        }
        if (!empty(BOOKING_NOTIFICATION_EMAIL)) {
            sendEmail(BOOKING_NOTIFICATION_EMAIL, 'Bookings', $subject, $html);
        }
        // Optional: customer confirmation (only if we have email and want to send branded)
        if (!empty($customerEmail)) {
            $custSubject = 'Your payment to Gisu Safaris is confirmed';
            $custHtml = '<p>Dear ' . htmlspecialchars($metadata['customer_name'] ?? 'Guest') . ',</p>' .
                        '<p>Thank you for your payment of <strong>' . htmlspecialchars((string)$amount) . ' ' . htmlspecialchars($currency) . '</strong>.</p>' .
                        '<p>Your booking ID is <strong>' . htmlspecialchars((string)$bookingId) . '</strong>.</p>' .
                        (!empty($receiptUrl) ? ('<p>You can view your receipt <a href="' . htmlspecialchars($receiptUrl) . '" target="_blank">here</a>.</p>') : '') .
                        '<p>We look forward to hosting you!</p>';
            sendEmail($customerEmail, 'Customer', $custSubject, $custHtml);
        }

        http_response_code(200);
        echo 'ok';
        exit;
    }

    // Unhandled events: acknowledge
    http_response_code(200);
    echo 'ignored';
    exit;

} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) { $db->rollBack(); }
    logEvent('error', 'Stripe webhook error', ['error' => $e->getMessage()]);
    badRequest('Webhook error', 500);
}
