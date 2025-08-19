<?php
/**
 * Contact Form API Endpoint
 * Handles main contact form submissions from contact.html
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/email.php';

// Set CORS headers
setCorsHeaders();
// Add strict security headers (CSP Report-Only, clickjacking, etc.)
setSecurityHeaders();

// Check rate limiting
checkRateLimit();

// Initialize session
initSession();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

// Enforce JSON requests to reduce CSRF and malformed submissions
$contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') === false) {
    sendJsonResponse(null, 415, 'Unsupported Media Type: application/json required');
}

/** Normalize ISO country codes/names to canonical names used in phone map */
function normalizeCountry(string $c): string {
    $c = trim($c);
    $u = strtoupper($c);
    $map = [
        'UG' => 'Uganda', 'UGA' => 'Uganda',
        'KE' => 'Kenya', 'KEN' => 'Kenya',
        'TZ' => 'Tanzania', 'TZA' => 'Tanzania',
        'RW' => 'Rwanda', 'RWA' => 'Rwanda',
        'ZA' => 'South Africa', 'ZAF' => 'South Africa',
        'NG' => 'Nigeria', 'NGA' => 'Nigeria',
        'IN' => 'India', 'IND' => 'India',
        'AE' => 'UAE', 'ARE' => 'UAE',
        'US' => 'USA', 'USA' => 'USA', 'UNITED STATES' => 'USA',
        'GB' => 'UK', 'GBR' => 'UK', 'UK' => 'UK', 'UNITED KINGDOM' => 'UK',
        'CA' => 'Canada', 'CAN' => 'Canada',
        'AU' => 'Australia', 'AUS' => 'Australia',
        'DE' => 'Germany', 'DEU' => 'Germany',
        'FR' => 'France', 'FRA' => 'France',
        'NL' => 'Netherlands', 'NLD' => 'Netherlands',
        'IE' => 'Ireland', 'IRL' => 'Ireland',
        'ES' => 'Spain', 'ESP' => 'Spain',
        'CH' => 'Switzerland', 'CHE' => 'Switzerland',
    ];
    if (isset($map[$u])) return $map[$u];
    return $c;
}

/** Optional nationality validator */
function nationalityLooksOk(string $v): bool {
    $v = trim($v);
    if ($v === '' || strlen($v) < 2 || strlen($v) > 56) return false;
    if (!preg_match("/^[A-Za-z\s\-']+$/", $v)) return false;
    if (preg_match('/(?:[^AEIOUaeiou\W]){4,}/', $v)) return false;
    return true;
}

/** Optional passport validator with country patterns */
function passportLooksOk(string $passport, string $nationality): bool {
    $p = strtoupper(trim($passport));
    if (!preg_match('/^[A-Z0-9]{8,9}$/', $p)) return false; // general baseline
    $nat = normalizeCountry($nationality);
    $patterns = [
        'USA' => '/^[0-9]{9}$/',
        'UK' => '/^[0-9]{9}$/',
        'Canada' => '/^[A-Z]{2}[0-9]{6}$/',
        'India' => '/^[A-Z][0-9]{7}$/',
    ];
    if (isset($patterns[$nat])) {
        return (bool)preg_match($patterns[$nat], $p);
    }
    return true;
}

/**
 * Helper: Validate human-looking names (letters, spaces, hyphen, apostrophe), length, and avoid gibberish
 */
function nameLooksOk(string $v): bool {
    $v = trim($v);
    if ($v === '' || strlen($v) < 2 || strlen($v) > 60) return false;
    if (!preg_match("/^[A-Za-z'\-\s]+$/", $v)) return false;
    if (preg_match('/[0-9]/', $v)) return false;
    // Reject 4+ consonants in a row (gibberish guard)
    if (preg_match('/(?:[^AEIOUaeiou\W]){4,}/', $v)) return false;
    // Ensure at least one vowel
    if (!preg_match('/[AEIOUaeiou]/', $v)) return false;
    return true;
}

/**
 * Helper: Email local-part heuristic (only applied for letters-only local parts)
 */
function emailLocalPartLooksOk(string $email): bool {
    $parts = explode('@', $email);
    if (count($parts) < 2) return false;
    $local = $parts[0];
    if (preg_match('/^[A-Za-z]+$/', $local)) {
        $vowelCount = preg_match_all('/[AEIOUaeiou]/', $local);
        if ($vowelCount < 3) return false;
        if (preg_match('/(?:[^AEIOUaeiou]){3,}/', $local)) return false; // 3+ consonants in a row
    }
    return true;
}

/**
 * Helper: Sanitize and validate phone numbers
 */
function sanitizePhone(string $v): string {
    $v = preg_replace('/[^\d+]/', '', $v);
    $v = preg_replace('/(?!^)\+/', '', $v);
    if (strpos($v, '+') !== false && $v[0] !== '+') {
        $v = '+' . str_replace('+', '', $v);
    }
    return $v;
}

function isValidE164(string $v): bool {
    return (bool)preg_match('/^\+?[1-9]\d{7,14}$/', $v);
}

function phoneLengthPlausibleForCountry(string $phone, string $country): bool {
    // Determine allowed total digit length by dialing code for a subset of Western countries
    $map = [
        'Uganda' => ['+256', 12, 12],
        'Kenya' => ['+254', 12, 12],
        'Tanzania' => ['+255', 12, 12],
        'Rwanda' => ['+250', 12, 12],
        'South Africa' => ['+27', 11, 12],
        'Nigeria' => ['+234', 12, 13],
        'India' => ['+91', 12, 12],
        'UAE' => ['+971', 12, 12],
        'USA' => ['+1', 11, 11],
        'UK' => ['+44', 11, 12],
        'Canada' => ['+1', 11, 11],
        'Australia' => ['+61', 11, 11],
        'Germany' => ['+49', 11, 13],
        'France' => ['+33', 11, 11],
        'Netherlands' => ['+31', 11, 11],
        'Ireland' => ['+353', 12, 12],
        'Spain' => ['+34', 11, 11],
        'Switzerland' => ['+41', 11, 11],
    ];
    $digits = preg_replace('/\D/', '', $phone);
    $len = strlen($digits);
    if (!isset($map[$country])) {
        return isValidE164($phone); // fallback to generic E.164
    }
    [$code, $min, $max] = $map[$country];
    $starts = (strpos($phone, '+') === 0) ? $phone : ('+' . $digits);
    if (strpos($starts, $code) !== 0) return false;
    return ($len >= $min && $len <= $max);
}

// Log the request
logEvent('info', 'Contact form API accessed', ['method' => 'POST']);

try {
    // Get and decode JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON data');
    }
    
    // Validate required fields (now requiring nationality and passport)
    $required_fields = ['firstName', 'lastName', 'email', 'country', 'groupSize', 'destination', 'nationality', 'passport'];
    $missing_fields = [];
    
    foreach ($required_fields as $field) {
        if (empty($input[$field])) {
            $missing_fields[] = $field;
        }
    }
    
    if (!empty($missing_fields)) {
        sendJsonResponse([
            'missing_fields' => $missing_fields
        ], 400, 'Missing required fields');
    }
    
    // Sanitize inputs
    $data = [
        'first_name' => sanitizeInput($input['firstName']),
        'last_name' => sanitizeInput($input['lastName']),
        'email' => filter_var($input['email'], FILTER_SANITIZE_EMAIL),
        'phone' => sanitizeInput($input['phone'] ?? ''),
        'country' => sanitizeInput($input['country']),
        'group_size' => sanitizeInput($input['groupSize']),
        'destination' => sanitizeInput($input['destination']),
        'duration' => sanitizeInput($input['duration'] ?? ''),
        'budget' => sanitizeInput($input['budget'] ?? ''),
        'travel_date' => !empty($input['travelDate']) ? $input['travelDate'] : null,
        'interests' => isset($input['interests']) && is_array($input['interests']) ? $input['interests'] : [],
        'message' => sanitizeInput($input['message'] ?? ''),
        'newsletter_opt_in' => !empty($input['newsletter'])
    ];
    // required extras
    $data['nationality'] = isset($input['nationality']) ? sanitizeInput($input['nationality']) : '';
    $data['passport'] = isset($input['passport']) ? strtoupper(preg_replace('/\s+/', '', sanitizeInput($input['passport']))) : '';
    
    // Validate names (anti-gibberish)
    if (!nameLooksOk($data['first_name'])) {
        logEvent('warning', 'validation_failed', ['field' => 'first_name', 'reason' => 'name_gibberish']);
        sendJsonResponse(null, 400, 'Invalid first name');
    }
    if (!nameLooksOk($data['last_name'])) {
        logEvent('warning', 'validation_failed', ['field' => 'last_name', 'reason' => 'name_gibberish']);
        sendJsonResponse(null, 400, 'Invalid last name');
    }

    // Validate email with heuristic
    if (!isValidEmail($data['email']) || !emailLocalPartLooksOk($data['email'])) {
        logEvent('warning', 'validation_failed', ['field' => 'email', 'reason' => 'format_or_heuristic']);
        sendJsonResponse(null, 400, 'Invalid email address');
    }

    // Validate phone by country if provided
    if (!empty($data['phone'])) {
        $normalizedPhone = sanitizePhone($data['phone']);
        $countryNorm = normalizeCountry($data['country']);
        if (!isValidE164($normalizedPhone) || !phoneLengthPlausibleForCountry($normalizedPhone, $countryNorm)) {
            logEvent('warning', 'validation_failed', ['field' => 'phone', 'reason' => 'e164_or_country_length', 'country' => $countryNorm]);
            sendJsonResponse(null, 400, 'Invalid phone number for selected country');
        }
        $data['phone'] = $normalizedPhone;
    }

    // Nationality/passport are required
    if (empty($data['nationality'])) {
        logEvent('warning', 'validation_failed', ['field' => 'nationality', 'reason' => 'missing']);
        sendJsonResponse(null, 400, 'Nationality is required');
    }
    if (!nationalityLooksOk($data['nationality'])) {
        logEvent('warning', 'validation_failed', ['field' => 'nationality', 'reason' => 'format_or_gibberish']);
        sendJsonResponse(null, 400, 'Invalid nationality');
    }
    if (empty($data['passport'])) {
        logEvent('warning', 'validation_failed', ['field' => 'passport', 'reason' => 'missing']);
        sendJsonResponse(null, 400, 'Passport is required');
    }
    if (!passportLooksOk($data['passport'], $data['nationality'] ?: $data['country'])) {
        logEvent('warning', 'validation_failed', ['field' => 'passport', 'reason' => 'pattern_mismatch', 'nationality' => $data['nationality'] ?: $data['country']]);
        sendJsonResponse(null, 400, 'Invalid passport number');
    }
    
    // Validate travel date if provided
    if ($data['travel_date'] && !DateTime::createFromFormat('Y-m-d', $data['travel_date'])) {
        sendJsonResponse(null, 400, 'Invalid travel date format');
    }
    
    // Get database connection
    $db = getDbConnection();
    
    // Check for duplicate submission (same email in last 5 minutes)
    $stmt = $db->prepare("
        SELECT id FROM contact_submissions 
        WHERE email = ? AND created_at > NOW() - INTERVAL '5 minutes'
        LIMIT 1
    ");
    $stmt->execute([$data['email']]);
    
    if ($stmt->fetch()) {
        sendJsonResponse(null, 429, 'Duplicate submission detected. Please wait before submitting again.');
    }
    
    // Ensure DB has nationality & passport columns (safe idempotent migration)
    try {
        $db->exec("ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);");
        $db->exec("ALTER TABLE contact_submissions ADD COLUMN IF NOT EXISTS passport VARCHAR(20);");
    } catch (Exception $e) {
        // Log but do not fail request; insert below will still work if columns pre-exist
        logEvent('warning', 'contact_submissions alter table failed or skipped', ['error' => $e->getMessage()]);
    }

    // Insert contact submission
    $stmt = $db->prepare("
        INSERT INTO contact_submissions (
            first_name, last_name, email, phone, country, group_size, 
            destination, duration, budget, travel_date, interests, 
            message, newsletter_opt_in, ip_address, user_agent, referrer_url,
            nationality, passport
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
    ");
    
    $result = $stmt->execute([
        $data['first_name'],
        $data['last_name'],
        $data['email'],
        $data['phone'],
        $data['country'],
        $data['group_size'],
        $data['destination'],
        $data['duration'],
        $data['budget'],
        $data['travel_date'],
        json_encode($data['interests']),
        $data['message'],
        $data['newsletter_opt_in'],
        getClientIp(),
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $_SERVER['HTTP_REFERER'] ?? '',
        $data['nationality'],
        $data['passport']
    ]);
    
    $contact_id = $stmt->fetch()['id'];
    
    // Handle newsletter subscription if opted in
    if ($data['newsletter_opt_in']) {
        try {
            $stmt = $db->prepare("
                INSERT INTO newsletter_subscriptions (email, subscription_source, ip_address, user_agent)
                VALUES (?, 'contact-form', ?, ?)
                ON CONFLICT (email) DO NOTHING
            ");
            $stmt->execute([
                $data['email'],
                getClientIp(),
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
        } catch (Exception $e) {
            logEvent('warning', 'Newsletter subscription failed during contact form', [
                'email' => $data['email'],
                'error' => $e->getMessage()
            ]);
        }
    }
    
    // Send confirmation email to customer
    try {
        $email_data = [
            'first_name' => $data['first_name'],
            'destination' => $data['destination'],
            'group_size' => $data['group_size'],
            'travel_date' => $data['travel_date'] ?: 'Not specified'
        ];
        
        sendTemplateEmail(
            $data['email'],
            $data['first_name'] . ' ' . $data['last_name'],
            'contact_confirmation',
            $email_data
        );
        
        logEvent('info', 'Contact confirmation email sent', ['email' => $data['email']]);
        
    } catch (Exception $e) {
        logEvent('error', 'Failed to send contact confirmation email', [
            'email' => $data['email'],
            'error' => $e->getMessage()
        ]);
    }
    
    // Send notification emails to all admin addresses
    try {
        $admin_subject = "New Safari Inquiry - {$data['destination']} - {$data['first_name']} {$data['last_name']}";
        $admin_message = generateAdminNotificationEmail($data, $contact_id);
        
        $admin_sent = sendMultipleAdminEmails(
            $admin_subject,
            $admin_message
        );
        
        if ($admin_sent) {
            logEvent('info', 'Admin notification emails sent for contact form', [
                'contact_id' => $contact_id,
                'recipients' => ADMIN_EMAIL_LIST
            ]);
        } else {
            logEvent('warning', 'Failed to send admin notification emails for contact form', [
                'contact_id' => $contact_id
            ]);
        }
        
    } catch (Exception $e) {
        logEvent('error', 'Exception while sending admin notification emails', [
            'contact_id' => $contact_id,
            'error' => $e->getMessage()
        ]);
    }
    
    // Log successful submission
    logEvent('info', 'Contact form submitted successfully', [
        'contact_id' => $contact_id,
        'email' => $data['email'],
        'destination' => $data['destination']
    ]);
    
    // Return success response
    sendJsonResponse([
        'contact_id' => $contact_id,
        'message' => 'Thank you for your safari inquiry! We will get back to you within 24 hours.',
        'newsletter_subscribed' => $data['newsletter_opt_in']
    ], 200, 'Contact form submitted successfully');
    
} catch (PDOException $e) {
    logEvent('error', 'Database error in contact form', [
        'error' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
    sendJsonResponse(null, 500, 'Database error occurred');
    
} catch (Exception $e) {
    logEvent('error', 'General error in contact form', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
    sendJsonResponse(null, 500, 'An error occurred while processing your request');
}

/**
 * Generate admin notification email content
 */
function generateAdminNotificationEmail($data, $contact_id) {
    $h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    $interests_text = !empty($data['interests']) ? $h(implode(', ', $data['interests'])) : 'Not specified';
    
    $html = "
    <html>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <h2 style='color: #2E7D32;'>New Safari Inquiry Received</h2>
        
        <div style='background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;'>
            <h3>Contact Information</h3>
            <p><strong>Name:</strong> {$h($data['first_name'])} {$h($data['last_name'])}</p>
            <p><strong>Email:</strong> {$h($data['email'])}</p>
            <p><strong>Phone:</strong> " . ($h($data['phone']) ?: 'Not provided') . "</p>
            <p><strong>Country:</strong> {$h($data['country'])}</p>
            <p><strong>Nationality:</strong> {$h($data['nationality'])}</p>
            <p><strong>Passport:</strong> {$h($data['passport'])}</p>
        </div>
        
        <div style='background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;'>
            <h3>Safari Details</h3>
            <p><strong>Destination:</strong> {$h($data['destination'])}</p>
            <p><strong>Group Size:</strong> {$h($data['group_size'])}</p>
            <p><strong>Duration:</strong> " . ($h($data['duration']) ?: 'Not specified') . "</p>
            <p><strong>Budget:</strong> " . ($h($data['budget']) ?: 'Not specified') . "</p>
            <p><strong>Travel Date:</strong> " . ($h($data['travel_date']) ?: 'Not specified') . "</p>
            <p><strong>Interests:</strong> {$interests_text}</p>
        </div>
        
        " . (!empty($data['message']) ? "
        <div style='background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;'>
            <h3>Message</h3>
            <p>" . nl2br($h($data['message'])) . "</p>
        </div>
        " : "") . "
        
        <div style='background: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0;'>
            <h3>Additional Information</h3>
            <p><strong>Contact ID:</strong> {$h($contact_id)}</p>
            <p><strong>Newsletter Subscription:</strong> " . ($data['newsletter_opt_in'] ? 'Yes' : 'No') . "</p>
            <p><strong>Submission Time:</strong> " . date('Y-m-d H:i:s T') . "</p>
        </div>
        
        <p><strong>Action Required:</strong> Please respond to this inquiry within 24 hours.</p>
        
        <p style='color: #666; font-size: 0.9em; margin-top: 30px;'>
            This email was automatically generated by the Gisu Safaris contact form system.
        </p>
    </body>
    </html>
    ";
    
    return $html;
}
?>
