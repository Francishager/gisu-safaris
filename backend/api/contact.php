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

// Check rate limiting
checkRateLimit();

// Initialize session
initSession();

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(null, 405, 'Method not allowed');
}

// Log the request
logEvent('info', 'Contact form API accessed', ['method' => 'POST']);

try {
    // Get and decode JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON data');
    }
    
    // Validate required fields
    $required_fields = ['firstName', 'lastName', 'email', 'country', 'groupSize', 'destination'];
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
    
    // Validate email
    if (!isValidEmail($data['email'])) {
        sendJsonResponse(null, 400, 'Invalid email address');
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
    
    // Insert contact submission
    $stmt = $db->prepare("
        INSERT INTO contact_submissions (
            first_name, last_name, email, phone, country, group_size, 
            destination, duration, budget, travel_date, interests, 
            message, newsletter_opt_in, ip_address, user_agent, referrer_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        $_SERVER['HTTP_REFERER'] ?? ''
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
    
    // Send notification email to admin
    try {
        $admin_subject = "New Safari Inquiry - {$data['destination']} - {$data['first_name']} {$data['last_name']}";
        $admin_message = generateAdminNotificationEmail($data, $contact_id);
        
        sendEmail(
            CONTACT_NOTIFICATION_EMAIL,
            'Gisu Safaris Admin',
            $admin_subject,
            $admin_message,
            $admin_message // Plain text version
        );
        
        logEvent('info', 'Admin notification email sent for contact form', ['contact_id' => $contact_id]);
        
    } catch (Exception $e) {
        logEvent('error', 'Failed to send admin notification email', [
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
    $interests_text = !empty($data['interests']) ? implode(', ', $data['interests']) : 'Not specified';
    
    $html = "
    <html>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <h2 style='color: #2E7D32;'>New Safari Inquiry Received</h2>
        
        <div style='background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;'>
            <h3>Contact Information</h3>
            <p><strong>Name:</strong> {$data['first_name']} {$data['last_name']}</p>
            <p><strong>Email:</strong> {$data['email']}</p>
            <p><strong>Phone:</strong> " . ($data['phone'] ?: 'Not provided') . "</p>
            <p><strong>Country:</strong> {$data['country']}</p>
        </div>
        
        <div style='background: #e8f5e8; padding: 20px; border-radius: 5px; margin: 20px 0;'>
            <h3>Safari Details</h3>
            <p><strong>Destination:</strong> {$data['destination']}</p>
            <p><strong>Group Size:</strong> {$data['group_size']}</p>
            <p><strong>Duration:</strong> " . ($data['duration'] ?: 'Not specified') . "</p>
            <p><strong>Budget:</strong> " . ($data['budget'] ?: 'Not specified') . "</p>
            <p><strong>Travel Date:</strong> " . ($data['travel_date'] ?: 'Not specified') . "</p>
            <p><strong>Interests:</strong> {$interests_text}</p>
        </div>
        
        " . (!empty($data['message']) ? "
        <div style='background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0;'>
            <h3>Message</h3>
            <p>" . nl2br(htmlspecialchars($data['message'])) . "</p>
        </div>
        " : "") . "
        
        <div style='background: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0;'>
            <h3>Additional Information</h3>
            <p><strong>Contact ID:</strong> {$contact_id}</p>
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
