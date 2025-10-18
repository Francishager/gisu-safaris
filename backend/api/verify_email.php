<?php

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';

setCorsHeaders();
checkRateLimit();
initSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

function resp($ok, $data = [], $msg = '') {
    sendJsonResponse($data + ['valid' => $ok], $ok ? 200 : 200, $msg);
}

function getInputEmail() {
    $email = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        if ($raw) {
            $j = json_decode($raw, true);
            if (is_array($j) && isset($j['email'])) $email = (string)$j['email'];
        }
        if ($email === '' && isset($_POST['email'])) $email = (string)$_POST['email'];
    } else {
        if (isset($_GET['email'])) $email = (string)$_GET['email'];
    }
    return trim($email);
}

function ensureCacheDir() {
    $dir = __DIR__ . '/../cache';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    return $dir;
}

function loadDisposableDomains() {
    static $domains = null;
    if ($domains !== null) return $domains;
    $cacheDir = ensureCacheDir();
    $cacheFile = $cacheDir . '/disposable_domains.json';
    $domains = [];
    $now = time();
    $ttl = 86400;
    $fetched = false;

    if (is_file($cacheFile) && ($now - filemtime($cacheFile) < $ttl)) {
        $data = json_decode(@file_get_contents($cacheFile), true);
        if (is_array($data)) { $domains = $data; return $domains; }
    }

    $sources = [
        'https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt',
        'https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json'
    ];
    foreach ($sources as $src) {
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 5]]);
            $raw = @file_get_contents($src, false, $ctx);
            if ($raw) {
                if (str_ends_with($src, '.txt')) {
                    $list = array_filter(array_map('trim', explode("\n", $raw)));
                } else {
                    $arr = json_decode($raw, true);
                    $list = is_array($arr) ? $arr : [];
                }
                if (!empty($list)) {
                    $domains = array_values(array_unique(array_map('strtolower', $list)));
                    $fetched = true;
                    break;
                }
            }
        } catch (Exception $e) { }
    }

    if (!$fetched) {
        $domains = [
            'mailinator.com','10minutemail.com','tempmail.com','tempmail.net','temp-mail.org','guerrillamail.com',
            'yopmail.com','getnada.com','fakemail.net','trashmail.com','discard.email','sharklasers.com','maildrop.cc'
        ];
    }

    @file_put_contents($cacheFile, json_encode($domains));
    return $domains;
}

function hasMx($domain) {
    if (function_exists('checkdnsrr')) {
        if (@checkdnsrr($domain, 'MX')) return true;
        if (@checkdnsrr($domain, 'A')) return true;
    }
    return false;
}

function externalVerify($email) {
    $base = $_ENV['EMAIL_VERIFIER_API_URL'] ?? '';
    $key = $_ENV['EMAIL_VERIFIER_API_KEY'] ?? '';
    if (!$base || !$key) return null;

    $url = $base;
    $headers = [];
    $host = parse_url($url, PHP_URL_HOST) ?: '';
    $glue = (strpos($url, '?') !== false) ? '&' : '?';

    if (stripos($host, 'kickbox.com') !== false) {
        // Kickbox expects apikey as a query param
        $url .= $glue . 'email=' . urlencode($email) . '&apikey=' . urlencode($key);
    } else {
        // Generic: Bearer token in header and email as query
        $url .= $glue . 'email=' . urlencode($email);
        $headers[] = 'Authorization: Bearer ' . $key;
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if (!empty($headers)) curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $resp = curl_exec($ch);
    if ($resp === false) { curl_close($ch); return null; }
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300) return null;
    $data = json_decode($resp, true);
    if (!is_array($data)) return null;
    if (isset($data['deliverable'])) return !!$data['deliverable'];
    if (isset($data['result'])) {
        $v = strtolower((string)$data['result']);
        if (in_array($v, ['deliverable','valid','ok'])) return true;
        if (in_array($v, ['undeliverable','invalid','bad'])) return false;
        // risky/unknown -> null
    }
    return null;
}

try {
    $email = getInputEmail();
    $emailSan = filter_var($email, FILTER_SANITIZE_EMAIL);
    $formatValid = filter_var($emailSan, FILTER_VALIDATE_EMAIL) !== false;
    $domain = '';
    if ($formatValid) {
        $parts = explode('@', strtolower($emailSan));
        if (count($parts) === 2) $domain = $parts[1]; else $formatValid = false;
    }

    $disposableList = loadDisposableDomains();
    $isDisposable = $domain !== '' ? in_array($domain, $disposableList, true) : false;
    $mx = $domain !== '' ? hasMx($domain) : false;
    $ext = null;
    if ($formatValid && !$isDisposable) {
        $ext = externalVerify($emailSan);
    }

    $strict = filter_var($_ENV['EMAIL_VERIFIER_STRICT'] ?? 'false', FILTER_VALIDATE_BOOLEAN);
    // In strict mode, require external true; otherwise treat null as pass-through
    $extPass = $strict ? ($ext === true) : ($ext !== false);
    $valid = ($formatValid && $mx && !$isDisposable && $extPass);

    resp($valid, [
        'email' => $emailSan,
        'valid_format' => $formatValid,
        'has_mx' => $mx,
        'is_disposable' => $isDisposable,
        'external_deliverable' => $ext,
        'domain' => $domain
    ], $valid ? 'OK' : 'Invalid email');
} catch (Exception $e) {
    logEvent('error', 'verify_email error', [ 'error' => $e->getMessage() ]);
    sendJsonResponse(null, 500, 'Server error');
}
