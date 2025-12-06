<?php

if (!defined('GISU_SAFARIS_BACKEND')) {
    http_response_code(403);
    exit('Access denied');
}

function canSendWhatsAppNotifications() {
    return defined('WHATSAPP_ACCESS_TOKEN') && WHATSAPP_ACCESS_TOKEN !== ''
        && defined('WHATSAPP_PHONE_ID') && WHATSAPP_PHONE_ID !== ''
        && defined('WHATSAPP_CLOUD_API_BASE') && WHATSAPP_CLOUD_API_BASE !== '';
}

function sendWhatsAppMessage($to, $body) {
    if (!canSendWhatsAppNotifications()) {
        logEvent('warning', 'WhatsApp not configured, skipping send', []);
        return false;
    }

    $toSanitized = preg_replace('/[^0-9]/', '', (string)$to);
    if ($toSanitized === '') {
        return false;
    }

    $url = rtrim(WHATSAPP_CLOUD_API_BASE, '/') . '/' . rawurlencode(WHATSAPP_PHONE_ID) . '/messages';

    $payload = [
        'messaging_product' => 'whatsapp',
        'to' => $toSanitized,
        'type' => 'text',
        'text' => [ 'body' => mb_substr((string)$body, 0, 1000, 'UTF-8') ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . WHATSAPP_ACCESS_TOKEN,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_TIMEOUT, 20);

    $resp = curl_exec($ch);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        logEvent('error', 'WhatsApp send failed', ['error' => $err]);
        return false;
    }
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code < 200 || $code >= 300) {
        logEvent('warning', 'WhatsApp HTTP error', ['status' => $code, 'response' => $resp]);
        return false;
    }

    return true;
}

function notifyAdminsWhatsAppHotLead($subject, $leadInfo = []) {
    if (!canSendWhatsAppNotifications()) {
        return false;
    }

    if (!defined('WHATSAPP_ADMIN_NUMBERS') || !is_array(WHATSAPP_ADMIN_NUMBERS) || empty(WHATSAPP_ADMIN_NUMBERS)) {
        return false;
    }

    $lines = [];
    $lines[] = 'HOT SAFARI LEAD';
    if (!empty($subject)) {
        $lines[] = $subject;
    }
    if (!empty($leadInfo['name'])) {
        $lines[] = 'Name: ' . $leadInfo['name'];
    }
    if (!empty($leadInfo['email'])) {
        $lines[] = 'Email: ' . $leadInfo['email'];
    }
    if (!empty($leadInfo['page'])) {
        $lines[] = 'Page: ' . $leadInfo['page'];
    }
    if (isset($leadInfo['lead_score'])) {
        $lines[] = 'Lead score: ' . $leadInfo['lead_score'];
    }
    if (!empty($leadInfo['package_interest'])) {
        $lines[] = 'Interest: ' . $leadInfo['package_interest'];
    }
    if (!empty($leadInfo['summary'])) {
        $lines[] = 'Summary: ' . $leadInfo['summary'];
    }

    $body = implode("\n", $lines);

    $anySent = false;
    foreach (WHATSAPP_ADMIN_NUMBERS as $num) {
        if (sendWhatsAppMessage($num, $body)) {
            $anySent = true;
        }
    }

    return $anySent;
}
