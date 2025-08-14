<?php
/**
 * General Enquiry API Endpoint
 * Handles general enquiry forms that appear on various pages
 */

define('GISU_SAFARIS_BACKEND', true);
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../includes/email.php';

// Set CORS headers
setCorsHeaders();

// Check rate limiting
checkRateLimit();

// Initialize session
initSession();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

// Log the request
logEvent('info', 'General enquiry API accessed', ['method' => 'POST']);

try {
    // Get and decode JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON data');
    }
    
    // Validate required fields
    $required_fields = ['firstName', 'email', 'subject', 'message'];
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
        'last_name' => sanitizeInput($input['lastName'] ?? ''),
        'email' => filter_var($input['email'], FILTER_SANITIZE_EMAIL),
        'phone' => sanitizeInput($input['phone'] ?? ''),
        'subject' => sanitizeInput($input['subject']),
        'enquiry_type' => sanitizeInput($input['enquiryType'] ?? 'general'),
        'message' => sanitizeInput($input['message']),
        'newsletter_opt_in' => !empty($input['newsletter']),
        'referrer_page' => sanitizeInput($input['referrerPage'] ?? '')
    ];
    
    // Validate email
    if (!isValidEmail($data['email'])) {
        sendJsonResponse(null, 400, 'Invalid email address');
    }
    
    // Validate enquiry type
    $allowed_enquiry_types = ['general', 'booking', 'information', 'customization', 'group', 'corporate'];
    if (!in_array($data['enquiry_type'], $allowed_enquiry_types)) {
        $data['enquiry_type'] = 'general';
    }
    
    // Get database connection
    $db = getDbConnection();
    
    // Check for duplicate enquiry (same email and subject in last 5 minutes)
    $stmt = $db->prepare("
        SELECT id FROM general_enquiries 
        WHERE email = ? AND subject = ? AND created_at > NOW() - INTERVAL '5 minutes'
        LIMIT 1
    ");
    $stmt->execute([$data['email'], $data['subject']]);
    
    if ($stmt->fetch()) {
        sendJsonResponse(null, 429, 'Duplicate enquiry detected. Please wait before submitting again.');
    }
    
    // Insert general enquiry
    $stmt = $db->prepare("
        INSERT INTO general_enquiries (
            first_name, last_name, email, phone, subject, enquiry_type, 
            message, newsletter_opt_in, referrer_page, ip_address, user_agent, referrer_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
    ");
    
    $result = $stmt->execute([
        $data['first_name'],
        $data['last_name'],
        $data['email'],
        $data['phone'],
        $data['subject'],
        $data['enquiry_type'],
        $data['message'],
        $data['newsletter_opt_in'],
        $data['referrer_page'],
        getClientIp(),
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $_SERVER['HTTP_REFERER'] ?? ''
    ]);
    
    $enquiry_id = $stmt->fetch()['id'];
    
    // Handle newsletter subscription if opted in
    if ($data['newsletter_opt_in']) {
        try {
            $stmt = $db->prepare("
                INSERT INTO newsletter_subscriptions (email, subscription_source, ip_address, user_agent)
                VALUES (?, 'enquiry-form', ?, ?)
                ON CONFLICT (email) DO NOTHING
            ");
            $stmt->execute([
                $data['email'],
                getClientIp(),
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
        } catch (Exception $e) {
            logEvent('warning', 'Newsletter subscription failed during enquiry', [
                'email' => $data['email'],
                'error' => $e->getMessage()
            ]);
        }
    }
    
    // Send confirmation email to customer
    try {
        $email_data = [
            'first_name' => $data['first_name'],
            'subject' => $data['subject'],
            'enquiry_type' => $data['enquiry_type'],
            'enquiry_id' => $enquiry_id
        ];
        
        sendTemplateEmail(
            $data['email'],
            $data['first_name'] . ' ' . $data['last_name'],
            'enquiry_confirmation',
            $email_data
        );
        
        logEvent('info', 'Enquiry confirmation email sent', [
            'email' => $data['email'],
            'enquiry_id' => $enquiry_id
        ]);
        
    } catch (Exception $e) {
        logEvent('error', 'Failed to send enquiry confirmation email', [
            'email' => $data['email'],
            'enquiry_id' => $enquiry_id,
            'error' => $e->getMessage()
        ]);
    }
    
    // Send notification emails to all admin addresses
    try {
        $admin_subject = "New Enquiry - {$data['subject']} - {$data['first_name']} {$data['last_name']}";
        $admin_message = generateEnquiryAdminNotificationEmail($data, $enquiry_id);
        
        $admin_sent = sendMultipleAdminEmails(
            $admin_subject,
            $admin_message
        );
        
        if ($admin_sent) {
            logEvent('info', 'Admin enquiry notification emails sent', [
                'enquiry_id' => $enquiry_id,
                'recipients' => ADMIN_EMAIL_LIST
            ]);
        } else {
            logEvent('warning', 'Failed to send admin enquiry notification emails', [
                'enquiry_id' => $enquiry_id
            ]);
        }
        
    } catch (Exception $e) {
        logEvent('error', 'Exception while sending admin enquiry notification emails', [
            'enquiry_id' => $enquiry_id,
            'error' => $e->getMessage()
        ]);
    }
    
    // Log successful enquiry
    logEvent('info', 'General enquiry submitted successfully', [
        'enquiry_id' => $enquiry_id,
        'email' => $data['email'],
        'subject' => $data['subject'],
        'enquiry_type' => $data['enquiry_type']
    ]);
    
    // Return success response
    sendJsonResponse([
        'enquiry_id' => $enquiry_id,
        'subject' => $data['subject'],
        'confirmation_message' => 'Your enquiry has been received! We will respond within 24 hours.',
        'response_timeframe' => '24 hours'
    ], 200, 'Enquiry submitted successfully');
    
} catch (PDOException $e) {
    logEvent('error', 'Database error in general enquiry', [
        'error' => $e->getMessage(),
        'code' => $e->getCode(),
        'email' => $data['email'] ?? 'unknown'
    ]);
    sendJsonResponse(null, 500, 'Database error occurred');
    
} catch (Exception $e) {
    logEvent('error', 'Unexpected error in general enquiry', [
        'error' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => $e->getFile()
    ]);
    sendJsonResponse(null, 500, 'An unexpected error occurred');
}

/**
 * Generate enquiry admin notification email content
 */
function generateEnquiryAdminNotificationEmail($data, $enquiry_id) {
    $phone = $data['phone'] ?: 'Not provided';
    $last_name = $data['last_name'] ?: '';
    $referrer_page = $data['referrer_page'] ?: 'Not specified';
    
    return "
        <h2>New General Enquiry Received</h2>
        <p><strong>Enquiry ID:</strong> #{$enquiry_id}</p>
        <hr>
        
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> {$data['first_name']} {$last_name}</p>
        <p><strong>Email:</strong> <a href=\"mailto:{$data['email']}\">{$data['email']}</a></p>
        <p><strong>Phone:</strong> {$phone}</p>
        
        <h3>Enquiry Details</h3>
        <p><strong>Subject:</strong> {$data['subject']}</p>
        <p><strong>Enquiry Type:</strong> " . ucfirst($data['enquiry_type']) . "</p>
        <p><strong>Referrer Page:</strong> {$referrer_page}</p>
        
        <h3>Message</h3>
        <div style=\"background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007cba; margin: 10px 0;\">
            " . nl2br(htmlspecialchars($data['message'])) . "
        </div>
        
        <h3>System Information</h3>
        <p><strong>Newsletter Subscription:</strong> " . ($data['newsletter_opt_in'] ? 'Yes' : 'No') . "</p>
        <p><strong>Submission Time:</strong> " . date('Y-m-d H:i:s T') . "</p>
        <p><strong>IP Address:</strong> " . getClientIp() . "</p>
        
        <hr>
        <p><em>Please respond to this enquiry within 24 hours.</em></p>
    ";
}
?>
