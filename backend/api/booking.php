<?php
/**
 * Safari Booking API Endpoint
 * Handles general safari booking submissions from package pages (excluding Rwanda WhatsApp booking)
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
logEvent('info', 'Safari booking API accessed', ['method' => 'POST']);

try {
    // Get and decode JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON data');
    }
    
    // Validate required fields
    $required_fields = ['firstName', 'lastName', 'email', 'country', 'packageName'];
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
        'package_name' => sanitizeInput($input['packageName']),
        'package_type' => sanitizeInput($input['packageType'] ?? 'uganda-safari'),
        'duration' => sanitizeInput($input['duration'] ?? ''),
        'group_size' => sanitizeInput($input['groupSize'] ?? '1'),
        'travel_date' => !empty($input['travelDate']) ? $input['travelDate'] : null,
        'budget' => sanitizeInput($input['budget'] ?? ''),
        'accommodation_level' => sanitizeInput($input['accommodationLevel'] ?? ''),
        'special_requirements' => sanitizeInput($input['specialRequirements'] ?? ''),
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
    
    // Validate group size
    if (!empty($data['group_size']) && (!is_numeric($data['group_size']) || $data['group_size'] < 1 || $data['group_size'] > 50)) {
        sendJsonResponse(null, 400, 'Invalid group size. Must be between 1 and 50');
    }
    
    // Get database connection
    $db = getDbConnection();
    
    // Check for duplicate booking (same email and package in last 10 minutes)
    $stmt = $db->prepare("
        SELECT id FROM safari_bookings 
        WHERE email = ? AND package_name = ? AND created_at > NOW() - INTERVAL '10 minutes'
        LIMIT 1
    ");
    $stmt->execute([$data['email'], $data['package_name']]);
    
    if ($stmt->fetch()) {
        sendJsonResponse(null, 429, 'Duplicate booking detected. Please wait before booking again.');
    }
    
    // Insert safari booking
    $stmt = $db->prepare("
        INSERT INTO safari_bookings (
            first_name, last_name, email, phone, country, package_name, 
            package_type, duration, group_size, travel_date, budget, 
            accommodation_level, special_requirements, message, 
            newsletter_opt_in, ip_address, user_agent, referrer_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
    ");
    
    $result = $stmt->execute([
        $data['first_name'],
        $data['last_name'],
        $data['email'],
        $data['phone'],
        $data['country'],
        $data['package_name'],
        $data['package_type'],
        $data['duration'],
        $data['group_size'],
        $data['travel_date'],
        $data['budget'],
        $data['accommodation_level'],
        $data['special_requirements'],
        $data['message'],
        $data['newsletter_opt_in'],
        getClientIp(),
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $_SERVER['HTTP_REFERER'] ?? ''
    ]);
    
    $booking_id = $stmt->fetch()['id'];
    
    // Handle newsletter subscription if opted in
    if ($data['newsletter_opt_in']) {
        try {
            $stmt = $db->prepare("
                INSERT INTO newsletter_subscriptions (email, subscription_source, ip_address, user_agent)
                VALUES (?, 'booking-form', ?, ?)
                ON CONFLICT (email) DO NOTHING
            ");
            $stmt->execute([
                $data['email'],
                getClientIp(),
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
        } catch (Exception $e) {
            logEvent('warning', 'Newsletter subscription failed during booking', [
                'email' => $data['email'],
                'error' => $e->getMessage()
            ]);
        }
    }
    
    // Send confirmation email to customer
    try {
        $email_data = [
            'first_name' => $data['first_name'],
            'package_name' => $data['package_name'],
            'duration' => $data['duration'],
            'group_size' => $data['group_size'],
            'travel_date' => $data['travel_date'] ?: 'To be confirmed',
            'booking_id' => $booking_id
        ];
        
        sendTemplateEmail(
            $data['email'],
            $data['first_name'] . ' ' . $data['last_name'],
            'booking_confirmation',
            $email_data
        );
        
        logEvent('info', 'Booking confirmation email sent', [
            'email' => $data['email'],
            'booking_id' => $booking_id
        ]);
        
    } catch (Exception $e) {
        logEvent('error', 'Failed to send booking confirmation email', [
            'email' => $data['email'],
            'booking_id' => $booking_id,
            'error' => $e->getMessage()
        ]);
    }
    
    // Send notification email to admin
    try {
        $admin_subject = "New Safari Booking - {$data['package_name']} - {$data['first_name']} {$data['last_name']}";
        $admin_message = generateBookingAdminNotificationEmail($data, $booking_id);
        
        sendEmail(
            BOOKING_NOTIFICATION_EMAIL,
            'Gisu Safaris Bookings',
            $admin_subject,
            $admin_message,
            strip_tags($admin_message)
        );
        
        logEvent('info', 'Admin booking notification email sent', ['booking_id' => $booking_id]);
        
    } catch (Exception $e) {
        logEvent('error', 'Failed to send booking admin notification email', [
            'booking_id' => $booking_id,
            'error' => $e->getMessage()
        ]);
    }
    
    // Log successful booking
    logEvent('info', 'Safari booking submitted successfully', [
        'booking_id' => $booking_id,
        'email' => $data['email'],
        'package_name' => $data['package_name'],
        'package_type' => $data['package_type']
    ]);
    
    // Return success response
    sendJsonResponse([
        'booking_id' => $booking_id,
        'package_name' => $data['package_name'],
        'confirmation_message' => 'Your safari booking has been received! We will contact you within 24 hours to confirm details.',
        'next_steps' => [
            'You will receive a confirmation email shortly',
            'Our team will contact you to finalize your itinerary',
            'Payment instructions will be provided after confirmation'
        ]
    ], 200, 'Safari booking submitted successfully');
    
} catch (PDOException $e) {
    logEvent('error', 'Database error in safari booking', [
        'error' => $e->getMessage(),
        'code' => $e->getCode(),
        'email' => $data['email'] ?? 'unknown'
    ]);
    sendJsonResponse(null, 500, 'Database error occurred');
    
} catch (Exception $e) {
    logEvent('error', 'Unexpected error in safari booking', [
        'error' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => $e->getFile()
    ]);
    sendJsonResponse(null, 500, 'An unexpected error occurred');
}

/**
 * Generate booking admin notification email content
 */
function generateBookingAdminNotificationEmail($data, $booking_id) {
    $travel_date = $data['travel_date'] ?: 'Not specified';
    $phone = $data['phone'] ?: 'Not provided';
    $budget = $data['budget'] ?: 'Not specified';
    $accommodation = $data['accommodation_level'] ?: 'Not specified';
    
    return "
        <h2>New Safari Booking Received</h2>
        <p><strong>Booking ID:</strong> #{$booking_id}</p>
        <hr>
        
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> {$data['first_name']} {$data['last_name']}</p>
        <p><strong>Email:</strong> <a href=\"mailto:{$data['email']}\">{$data['email']}</a></p>
        <p><strong>Phone:</strong> {$phone}</p>
        <p><strong>Country:</strong> {$data['country']}</p>
        
        <h3>Booking Details</h3>
        <p><strong>Package:</strong> {$data['package_name']}</p>
        <p><strong>Package Type:</strong> {$data['package_type']}</p>
        <p><strong>Duration:</strong> {$data['duration']}</p>
        <p><strong>Group Size:</strong> {$data['group_size']} people</p>
        <p><strong>Travel Date:</strong> {$travel_date}</p>
        <p><strong>Budget:</strong> {$budget}</p>
        <p><strong>Accommodation Level:</strong> {$accommodation}</p>
        
        " . (!empty($data['special_requirements']) ? "<h3>Special Requirements</h3><p>" . nl2br(htmlspecialchars($data['special_requirements'])) . "</p>" : "") . "
        
        " . (!empty($data['message']) ? "<h3>Additional Message</h3><p>" . nl2br(htmlspecialchars($data['message'])) . "</p>" : "") . "
        
        <h3>System Information</h3>
        <p><strong>Newsletter Subscription:</strong> " . ($data['newsletter_opt_in'] ? 'Yes' : 'No') . "</p>
        <p><strong>Submission Time:</strong> " . date('Y-m-d H:i:s T') . "</p>
        <p><strong>IP Address:</strong> " . getClientIp() . "</p>
        
        <hr>
        <p><em>Please follow up with this customer within 24 hours to confirm booking details.</em></p>
    ";
}
?>
