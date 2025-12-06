<?php
/**
 * AI Activity Tracking API Endpoint
 * Receives high-intent activity events from the AI bot
 * and sends WhatsApp notifications to admins for strong buying signals.
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/whatsapp.php';

setCorsHeaders();
setSecurityHeaders();
checkRateLimit();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

try {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        sendJsonResponse(null, 400, 'Invalid JSON payload');
    }

    $action = isset($input['action']) ? sanitizeInput($input['action']) : '';
    $label = isset($input['label']) ? sanitizeInput($input['label']) : '';
    $page = isset($input['page']) ? sanitizeInput($input['page']) : '';
    $sessionId = isset($input['sessionId']) ? sanitizeInput($input['sessionId']) : '';

    $leadScore = isset($input['lead_score']) && $input['lead_score'] !== null
        ? (int)$input['lead_score']
        : null;
    $bookingIntent = !empty($input['booking_intent']);
    $packageInterest = isset($input['package_interest']) ? sanitizeInput($input['package_interest']) : '';

    $visitor = is_array($input['visitor'] ?? null) ? $input['visitor'] : [];
    $visitorName = isset($visitor['name']) ? sanitizeInput($visitor['name']) : '';
    $visitorEmail = isset($visitor['email']) ? filter_var($visitor['email'], FILTER_SANITIZE_EMAIL) : '';

    if ($action === '') {
        sendJsonResponse(null, 400, 'Missing action');
    }

    $meta = [
        'ip' => getClientIp(),
        'ua' => $_SERVER['HTTP_USER_AGENT'] ?? '',
        'referrer' => $_SERVER['HTTP_REFERER'] ?? '',
        'sessionId' => $sessionId,
    ];

    logEvent('info', 'AI bot activity event', [
        'action' => $action,
        'label' => $label,
        'page' => $page,
        'lead_score' => $leadScore,
        'booking_intent' => $bookingIntent,
        'package_interest' => $packageInterest,
        'visitor_email' => $visitorEmail,
        'visitor_name' => $visitorName,
        'meta' => $meta,
    ]);

    $isHighIntent = false;
    if ($bookingIntent) {
        $isHighIntent = true;
    } elseif ($leadScore !== null && $leadScore >= 70) {
        $isHighIntent = true;
    } elseif ($action === 'human_handoff' || $action === 'package_view') {
        $isHighIntent = true;
    }

    if ($isHighIntent) {
        try {
            $subject = 'AI Bot Activity - ' . ucfirst(str_replace('_', ' ', $action));

            $summaryParts = [];
            if ($label !== '') {
                $summaryParts[] = $label;
            }
            if ($page !== '') {
                $summaryParts[] = 'Page: ' . $page;
            }
            if ($sessionId !== '') {
                $summaryParts[] = 'Session: ' . $sessionId;
            }
            if ($leadScore !== null) {
                $summaryParts[] = 'Score: ' . $leadScore;
            }
            if ($bookingIntent) {
                $summaryParts[] = 'Booking intent: yes';
            }
            if ($packageInterest !== '') {
                $summaryParts[] = 'Interest: ' . $packageInterest;
            }

            $summary = implode(' | ', $summaryParts);

            $whInfo = [
                'name' => $visitorName,
                'email' => $visitorEmail,
                'page' => $page !== '' ? $page : ($_SERVER['HTTP_REFERER'] ?? ''),
                'lead_score' => $leadScore,
                'package_interest' => $packageInterest,
                'summary' => mb_substr($summary, 0, 240, 'UTF-8'),
            ];

            notifyAdminsWhatsAppHotLead($subject, $whInfo);
        } catch (Exception $e) {
            logEvent('warning', 'Failed to send WhatsApp notification for AI activity', [
                'error' => $e->getMessage(),
                'action' => $action,
                'page' => $page,
            ]);
        }
    }

    sendJsonResponse([
        'ok' => true,
        'high_intent' => $isHighIntent,
    ], 200, 'Activity recorded');

} catch (Exception $e) {
    logEvent('error', 'Unexpected error in ai_activity', [
        'error' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => $e->getFile(),
    ]);
    sendJsonResponse(null, 500, 'An unexpected error occurred');
}
