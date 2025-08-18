<?php
/**
 * AI Safari Bot Chat Transcript API
 * Accepts transcript JSON, validates, formats, and emails to admins and visitor (if consented)
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/email.php';

// CORS and session/rate limit
setCorsHeaders();
checkRateLimit();
initSession();

// Only POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

// Optional API key validation (if provided)
$provided_key = $_SERVER['HTTP_X_API_KEY'] ?? '';
if (!empty($provided_key) && !validateApiKey($provided_key)) {
    sendJsonResponse(null, 401, 'Invalid API key');
}

// Log access
logEvent('info', 'Chat transcript endpoint hit', [ 'ua' => ($_SERVER['HTTP_USER_AGENT'] ?? '') ]);

try {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE || !is_array($input)) {
        sendJsonResponse(null, 400, 'Invalid JSON');
    }

    // Extract and sanitize
    $visitor = isset($input['visitor']) && is_array($input['visitor']) ? $input['visitor'] : [];
    $name = isset($visitor['name']) ? sanitizeInput($visitor['name']) : '';
    $email = isset($visitor['email']) ? filter_var($visitor['email'], FILTER_SANITIZE_EMAIL) : '';
    $consent = !empty($visitor['consent']);

    $history = isset($input['history']) && is_array($input['history']) ? $input['history'] : [];
    $preferences = isset($input['preferences']) && is_array($input['preferences']) ? $input['preferences'] : [];
    $meta = isset($input['meta']) && is_array($input['meta']) ? $input['meta'] : [];

    // Minimal validation
    if (empty($history)) {
        sendJsonResponse(null, 400, 'Transcript history required');
    }

    // Build summary (first user message + last bot message if available)
    $firstUser = null; $lastBot = null; $userCount = 0; $botCount = 0;
    foreach ($history as $m) {
        if (!is_array($m)) continue;
        $sender = strtolower($m['sender'] ?? '');
        if ($sender === 'user') { $userCount++; if ($firstUser === null) $firstUser = $m['message'] ?? ''; }
        if ($sender === 'bot') { $botCount++; $lastBot = $m['message'] ?? $lastBot; }
    }
    $summary = trim((string)($firstUser ?? ''));
    if ($summary !== '' && strlen($summary) > 120) { $summary = substr($summary, 0, 117) . '...'; }

    // Build HTML transcript
    $sessionStart = isset($input['sessionStart']) ? htmlspecialchars($input['sessionStart']) : date('c');
    $sessionEnd = isset($input['sessionEnd']) ? htmlspecialchars($input['sessionEnd']) : date('c');
    $page = htmlspecialchars($meta['page'] ?? ($_SERVER['HTTP_REFERER'] ?? ''));
    $ua = htmlspecialchars($_SERVER['HTTP_USER_AGENT'] ?? '');
    $ip = htmlspecialchars(getClientIp());

    // Analytics/meta extraction
    $sessionId = (string)($input['sessionId'] ?? ($meta['session_id'] ?? ''));
    if ($sessionId === '') { $sessionId = substr(bin2hex(random_bytes(24)), 0, 48); }
    $referrer = (string)($meta['referrer'] ?? ($_SERVER['HTTP_REFERER'] ?? ''));
    $utm = is_array($meta['utm'] ?? null) ? $meta['utm'] : [];
    $device = (string)($meta['device'] ?? ($meta['userAgent'] ?? ''));
    $locale = (string)($meta['locale'] ?? '');
    $tzOffset = (int)($meta['tzOffset'] ?? 0);
    $leadScore = isset($meta['lead_score']) ? (int)$meta['lead_score'] : null;
    $bookingIntent = !empty($meta['booking_intent']);
    $packageInterest = (string)($meta['package_interest'] ?? '');
    $marketingConsent = !empty($meta['marketing_consent']);

    // PII masking helpers for analytics persistence (do not affect email body)
    $maskPIIText = function ($text) {
        if (!is_string($text) || $text === '') return $text;
        // Mask emails
        $masked = preg_replace('/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i', '[REDACTED_EMAIL]', $text);
        // Mask phone numbers (simple patterns for intl/local)
        $masked = preg_replace('/(?:(?:\+\d{1,3}[\s-]?)?(?:\(\d{1,4}\)[\s-]?)?\d[\d\s-]{6,}\d)/', '[REDACTED_PHONE]', $masked);
        // Mask names preceded by Name: pattern (best-effort)
        $masked = preg_replace('/(?i)(name\s*:\s*)([^\n<]{1,80})/', '$1[REDACTED_NAME]', $masked);
        return $masked;
    };

    // Compute duration and counts
    $durationSeconds = null;
    try {
        $startTs = strtotime($input['sessionStart'] ?? '');
        $endTs = strtotime($input['sessionEnd'] ?? '');
        if ($startTs && $endTs && $endTs >= $startTs) {
            $durationSeconds = $endTs - $startTs;
        }
    } catch (Exception $_e) { /* ignore */ }

    $rows = '';
    foreach ($history as $m) {
        if (!is_array($m)) continue;
        $sender = htmlspecialchars((string)($m['sender'] ?? ''));
        $msg = $m['message'] ?? '';
        // Allow basic HTML for bot messages already sanitized upstream; still escape
        $msgSafe = nl2br(htmlspecialchars((string)$msg));
        $ts = htmlspecialchars((string)($m['timestamp'] ?? ''));
        $rows .= "<tr><td style='padding:8px;border-bottom:1px solid #eee;width:90px;font-weight:bold;'>$sender</td><td style='padding:8px;border-bottom:1px solid #eee;'>$msgSafe<br><small style='color:#777;'>$ts</small></td></tr>";
    }

    $prefHtml = '';
    if (!empty($preferences)) {
        $prefHtml .= "<ul style='margin:0;padding-left:18px;'>";
        foreach ($preferences as $k => $v) {
            if (is_array($v)) $v = implode(', ', $v);
            $prefHtml .= "<li><strong>" . htmlspecialchars((string)$k) . ":</strong> " . htmlspecialchars((string)$v) . "</li>";
        }
        $prefHtml .= "</ul>";
    } else {
        $prefHtml = '<em>No explicit preferences captured.</em>';
    }

    $visitorBlock = "<p><strong>Name:</strong> " . ($name !== '' ? htmlspecialchars($name) : 'Anonymous') . "<br><strong>Email:</strong> " . ($email !== '' ? htmlspecialchars($email) : 'Not provided') . "<br><strong>Consent to email:</strong> " . ($consent ? 'Yes' : 'No') . "</p>";

    $html = "<html><body style='font-family:Arial,sans-serif;color:#333;'>
        <h2 style='color:#2E7D32;margin:0 0 10px 0;'>AI Safari Chat Transcript</h2>
        <p style='margin:0 0 16px 0;'>Session: <strong>$sessionStart</strong> → <strong>$sessionEnd</strong></p>
        <div style='background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:12px;margin-bottom:12px;'>
            <h3 style='margin:0 0 8px 0;'>Visitor</h3>
            $visitorBlock
        </div>
        <div style='background:#eef7f0;border:1px solid #d9efe0;border-radius:8px;padding:12px;margin-bottom:12px;'>
            <h3 style='margin:0 0 8px 0;'>Preferences</h3>
            $prefHtml
        </div>
        <div style='background:#fff;border:1px solid #eee;border-radius:8px;padding:0;margin:0 0 12px 0;'>
            <table style='width:100%;border-collapse:collapse;'>$rows</table>
        </div>
        <div style='background:#e9f2fb;border:1px solid #cfe5ff;border-radius:8px;padding:12px;'>
            <h3 style='margin:0 0 8px 0;'>Context</h3>
            <p style='margin:0;'><strong>Page:</strong> $page<br><strong>User-Agent:</strong> $ua<br><strong>IP:</strong> $ip</p>
        </div>
        <p style='color:#666;font-size:12px;margin-top:16px;'>&copy; " . date('Y') . " Gisu Safaris</p>
    </body></html>";

    $subject = 'AI Safari Chat Transcript - ' . ($name !== '' ? $name : 'Visitor') . ($summary !== '' ? (' - ' . $summary) : '');

    // Persist analytics: chat_sessions and chat_messages
    $persisted = false; $messagesSaved = 0;
    try {
        $db = getDbConnection();
        // Prepare masked fields for analytics if marketing consent is false
        $storeName = $marketingConsent ? ($name ?: null) : null;
        $storeEmail = $marketingConsent ? ($email ?: null) : null;
        $storeIp = $marketingConsent ? getClientIp() : null;
        $storePreferences = $marketingConsent ? $preferences : json_decode(json_encode($preferences), true);
        if (!$marketingConsent && !empty($storePreferences)) {
            // Best-effort mask string values in preferences
            foreach ($storePreferences as $pk => $pv) {
                if (is_string($pv)) $storePreferences[$pk] = $maskPIIText($pv);
            }
        }

        // Upsert session
        $stmt = $db->prepare("INSERT INTO chat_sessions (
            session_id, visitor_name, visitor_email, consent_transcript, marketing_consent,
            page, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
            device, locale, tz_offset_minutes, ip_address, user_agent,
            started_at, ended_at, duration_seconds, messages_total, user_msgs, bot_msgs,
            lead_score, booking_intent, package_interest, preferences, meta
        ) VALUES (
            :session_id, :visitor_name, :visitor_email, :consent_transcript, :marketing_consent,
            :page, :referrer, :utm_source, :utm_medium, :utm_campaign, :utm_term, :utm_content,
            :device, :locale, :tz_offset_minutes, :ip_address, :user_agent,
            :started_at, :ended_at, :duration_seconds, :messages_total, :user_msgs, :bot_msgs,
            :lead_score, :booking_intent, :package_interest, :preferences, :meta
        )
        ON CONFLICT (session_id) DO UPDATE SET
            visitor_name=EXCLUDED.visitor_name,
            visitor_email=EXCLUDED.visitor_email,
            consent_transcript=EXCLUDED.consent_transcript,
            marketing_consent=EXCLUDED.marketing_consent,
            page=EXCLUDED.page,
            referrer=EXCLUDED.referrer,
            utm_source=EXCLUDED.utm_source,
            utm_medium=EXCLUDED.utm_medium,
            utm_campaign=EXCLUDED.utm_campaign,
            utm_term=EXCLUDED.utm_term,
            utm_content=EXCLUDED.utm_content,
            device=EXCLUDED.device,
            locale=EXCLUDED.locale,
            tz_offset_minutes=EXCLUDED.tz_offset_minutes,
            ip_address=EXCLUDED.ip_address,
            user_agent=EXCLUDED.user_agent,
            started_at=EXCLUDED.started_at,
            ended_at=EXCLUDED.ended_at,
            duration_seconds=EXCLUDED.duration_seconds,
            messages_total=EXCLUDED.messages_total,
            user_msgs=EXCLUDED.user_msgs,
            bot_msgs=EXCLUDED.bot_msgs,
            lead_score=EXCLUDED.lead_score,
            booking_intent=EXCLUDED.booking_intent,
            package_interest=EXCLUDED.package_interest,
            preferences=EXCLUDED.preferences,
            meta=EXCLUDED.meta;");

        $stmt->execute([
            ':session_id' => $sessionId,
            ':visitor_name' => $storeName,
            ':visitor_email' => $storeEmail,
            ':consent_transcript' => $consent,
            ':marketing_consent' => $marketingConsent,
            ':page' => $meta['page'] ?? ($_SERVER['HTTP_REFERER'] ?? ''),
            ':referrer' => $referrer,
            ':utm_source' => $utm['source'] ?? ($meta['utm_source'] ?? null),
            ':utm_medium' => $utm['medium'] ?? ($meta['utm_medium'] ?? null),
            ':utm_campaign' => $utm['campaign'] ?? ($meta['utm_campaign'] ?? null),
            ':utm_term' => $utm['term'] ?? ($meta['utm_term'] ?? null),
            ':utm_content' => $utm['content'] ?? ($meta['utm_content'] ?? null),
            ':device' => $device ?: null,
            ':locale' => $locale ?: null,
            ':tz_offset_minutes' => $tzOffset,
            ':ip_address' => $storeIp,
            ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
            ':started_at' => ($input['sessionStart'] ?? null) ?: null,
            ':ended_at' => ($input['sessionEnd'] ?? null) ?: null,
            ':duration_seconds' => $durationSeconds,
            ':messages_total' => count($history),
            ':user_msgs' => $userCount,
            ':bot_msgs' => $botCount,
            ':lead_score' => $leadScore,
            ':booking_intent' => $bookingIntent,
            ':package_interest' => $packageInterest ?: null,
            ':preferences' => json_encode($storePreferences ?: (object)[]),
            ':meta' => json_encode($meta),
        ]);

        // Insert messages (append-only)
        if (!empty($history)) {
            $msgStmt = $db->prepare("INSERT INTO chat_messages (session_id, sender, message, occurred_at) VALUES (:sid, :sender, :message, :occurred_at)");
            foreach ($history as $m) {
                if (!is_array($m)) continue;
                $senderVal = strtolower($m['sender'] ?? '');
                if ($senderVal !== 'user' && $senderVal !== 'bot') $senderVal = 'user';
                $messageToStore = (string)($m['message'] ?? '');
                if (!$marketingConsent && $senderVal === 'user') {
                    $messageToStore = $maskPIIText($messageToStore);
                }
                $msgStmt->execute([
                    ':sid' => $sessionId,
                    ':sender' => $senderVal,
                    ':message' => $messageToStore,
                    ':occurred_at' => ($m['timestamp'] ?? null) ?: null,
                ]);
                $messagesSaved++;
            }
        }
        $persisted = true;
    } catch (Exception $e) {
        logEvent('error', 'Failed to persist chat analytics', [ 'error' => $e->getMessage() ]);
    }

    // Hot lead tweak to subject
    if ($bookingIntent || ($leadScore !== null && $leadScore >= 70)) {
        $subject = '[HOT LEAD] ' . $subject;
    }

    // Send to admins
    $adminSent = false;
    try {
        $adminSent = sendMultipleAdminEmails($subject, $html);
    } catch (Exception $e) {
        logEvent('error', 'Failed to send admin transcript emails', [ 'error' => $e->getMessage() ]);
    }

    // Route hot lead to dedicated booking notifications address as well
    $hotLeadRouted = false;
    if ($bookingIntent || ($leadScore !== null && $leadScore >= 70)) {
        try {
            if (!empty(BOOKING_NOTIFICATION_EMAIL)) {
                sendEmail(BOOKING_NOTIFICATION_EMAIL, 'Bookings', $subject, $html);
                $hotLeadRouted = true;
            }
        } catch (Exception $e) {
            logEvent('warning', 'Failed to send hot lead email to booking notifications', [ 'error' => $e->getMessage() ]);
        }
    }

    // CC visitor if consent and email valid
    $visitorSent = false;
    if ($consent && !empty($email) && isValidEmail($email)) {
        try {
            sendEmail($email, $name, 'Your Safari Chat Transcript', $html);
            $visitorSent = true;
        } catch (Exception $e) {
            logEvent('warning', 'Failed to email transcript to visitor', [ 'email' => $email, 'error' => $e->getMessage() ]);
        }
    }

    logEvent('info', 'Transcript processed', [
        'admin_sent' => $adminSent,
        'visitor_sent' => $visitorSent,
        'messages' => count($history),
        'user_msgs' => $userCount,
        'bot_msgs' => $botCount,
        'page' => $page,
        'session_id' => $sessionId,
        'persisted' => $persisted,
        'messages_saved' => $messagesSaved,
        'hotlead_routed' => isset($hotLeadRouted) ? $hotLeadRouted : false,
    ]);

    sendJsonResponse([
        'admin_sent' => $adminSent,
        'visitor_sent' => $visitorSent
    ], 200, 'Transcript received');

} catch (Exception $e) {
    logEvent('error', 'Transcript endpoint error', [ 'error' => $e->getMessage() ]);
    sendJsonResponse(null, 500, 'Server error');
}
