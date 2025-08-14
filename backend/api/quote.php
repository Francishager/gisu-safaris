<?php
/**
 * Quote Request API Endpoint
 * Handles safari quote requests with detailed package requirements
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
logEvent('info', 'Quote request API accessed', ['method' => 'POST']);

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
        'budget_range' => sanitizeInput($input['budgetRange'] ?? ''),
        'travel_date' => !empty($input['travelDate']) ? $input['travelDate'] : null,
        'accommodation_level' => sanitizeInput($input['accommodationLevel'] ?? ''),
        'activities' => isset($input['activities']) && is_array($input['activities']) ? $input['activities'] : [],
        'special_interests' => sanitizeInput($input['specialInterests'] ?? ''),
        'dietary_requirements' => sanitizeInput($input['dietaryRequirements'] ?? ''),
        'mobility_requirements' => sanitizeInput($input['mobilityRequirements'] ?? ''),
        'additional_requirements' => sanitizeInput($input['additionalRequirements'] ?? ''),
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
    if (!is_numeric($data['group_size']) || $data['group_size'] < 1 || $data['group_size'] > 50) {
        sendJsonResponse(null, 400, 'Invalid group size. Must be between 1 and 50');
    }
    
    // Validate activities array
    $allowed_activities = [
        'game_drives', 'gorilla_trekking', 'chimpanzee_tracking', 'bird_watching',
        'cultural_visits', 'nature_walks', 'boat_cruise', 'white_water_rafting',
        'hiking', 'photography', 'community_visits', 'conservation_experiences'
    ];
    $data['activities'] = array_intersect($data['activities'], $allowed_activities);
    
    // Get database connection
    $db = getDbConnection();
    
    // Check for duplicate quote request (same email and destination in last 30 minutes)
    $stmt = $db->prepare("
        SELECT id FROM quote_requests 
        WHERE email = ? AND destination = ? AND created_at > NOW() - INTERVAL '30 minutes'
        LIMIT 1
    ");
    $stmt->execute([$data['email'], $data['destination']]);
    
    if ($stmt->fetch()) {
        sendJsonResponse(null, 429, 'Duplicate quote request detected. Please wait before requesting another quote.');
    }
    
    // Insert quote request
    $stmt = $db->prepare("
        INSERT INTO quote_requests (
            first_name, last_name, email, phone, country, group_size, destination, 
            duration, budget_range, travel_date, accommodation_level, activities, 
            special_interests, dietary_requirements, mobility_requirements, 
            additional_requirements, message, newsletter_opt_in, 
            ip_address, user_agent, referrer_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        $data['budget_range'],
        $data['travel_date'],
        $data['accommodation_level'],
        json_encode($data['activities']),
        $data['special_interests'],
        $data['dietary_requirements'],
        $data['mobility_requirements'],
        $data['additional_requirements'],
        $data['message'],
        $data['newsletter_opt_in'],
        getClientIp(),
        $_SERVER['HTTP_USER_AGENT'] ?? '',
        $_SERVER['HTTP_REFERER'] ?? ''
    ]);
    
    $quote_id = $stmt->fetch()['id'];
    
    // Handle newsletter subscription if opted in
    if ($data['newsletter_opt_in']) {
        try {
            $stmt = $db->prepare("
                INSERT INTO newsletter_subscriptions (email, subscription_source, ip_address, user_agent)
                VALUES (?, 'quote-form', ?, ?)
                ON CONFLICT (email) DO NOTHING
            ");
            $stmt->execute([
                $data['email'],
                getClientIp(),
                $_SERVER['HTTP_USER_AGENT'] ?? ''
            ]);
        } catch (Exception $e) {
            logEvent('warning', 'Newsletter subscription failed during quote request', [
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
            'travel_date' => $data['travel_date'] ?: 'To be determined',
            'quote_id' => $quote_id
        ];
        
        sendTemplateEmail(
            $data['email'],
            $data['first_name'] . ' ' . $data['last_name'],
            'quote_confirmation',
            $email_data
        );
        
        logEvent('info', 'Quote request confirmation email sent', [
            'email' => $data['email'],
            'quote_id' => $quote_id
        ]);
        
    } catch (Exception $e) {
        logEvent('error', 'Failed to send quote confirmation email', [
            'email' => $data['email'],
            'quote_id' => $quote_id,
            'error' => $e->getMessage()
        ]);
    }
    
    // Send notification emails to all admin addresses
    try {
        $admin_subject = "New Quote Request - {$data['destination']} - {$data['first_name']} {$data['last_name']}";
        $admin_message = generateQuoteAdminNotificationEmail($data, $quote_id);
        
        $admin_sent = sendMultipleAdminEmails(
            $admin_subject,
            $admin_message
        );
        
        if ($admin_sent) {
            logEvent('info', 'Admin quote notification emails sent', [
                'quote_id' => $quote_id,
                'recipients' => ADMIN_EMAIL_LIST
            ]);
        } else {
            logEvent('warning', 'Failed to send admin quote notification emails', [
                'quote_id' => $quote_id
            ]);
        }
        
    } catch (Exception $e) {
        logEvent('error', 'Exception while sending admin quote notification emails', [
            'quote_id' => $quote_id,
            'error' => $e->getMessage()
        ]);
    }
    
    // Log successful quote request
    logEvent('info', 'Quote request submitted successfully', [
        'quote_id' => $quote_id,
        'email' => $data['email'],
        'destination' => $data['destination'],
        'group_size' => $data['group_size']
    ]);
    
    // Return success response
    sendJsonResponse([
        'quote_id' => $quote_id,
        'destination' => $data['destination'],
        'group_size' => $data['group_size'],
        'confirmation_message' => 'Your quote request has been received! We will prepare a customized quote and send it to you within 48 hours.',
        'next_steps' => [
            'Our safari specialists will review your requirements',
            'We will prepare a detailed, customized itinerary',
            'You will receive your personalized quote within 48 hours',
            'We will contact you to discuss any adjustments'
        ],
        'response_timeframe' => '48 hours'
    ], 200, 'Quote request submitted successfully');
    
} catch (PDOException $e) {
    logEvent('error', 'Database error in quote request', [
        'error' => $e->getMessage(),
        'code' => $e->getCode(),
        'email' => $data['email'] ?? 'unknown'
    ]);
    sendJsonResponse(null, 500, 'Database error occurred');
    
} catch (Exception $e) {
    logEvent('error', 'Unexpected error in quote request', [
        'error' => $e->getMessage(),
        'line' => $e->getLine(),
        'file' => $e->getFile()
    ]);
    sendJsonResponse(null, 500, 'An unexpected error occurred');
}

/**
 * Generate quote admin notification email content
 */
function generateQuoteAdminNotificationEmail($data, $quote_id) {
    $travel_date = $data['travel_date'] ?: 'Not specified';
    $phone = $data['phone'] ?: 'Not provided';
    $budget_range = $data['budget_range'] ?: 'Not specified';
    $accommodation = $data['accommodation_level'] ?: 'Not specified';
    $duration = $data['duration'] ?: 'Not specified';
    
    $activities_list = '';
    if (!empty($data['activities'])) {
        $activities_display = array_map(function($activity) {
            return ucwords(str_replace('_', ' ', $activity));
        }, $data['activities']);
        $activities_list = '<p><strong>Requested Activities:</strong> ' . implode(', ', $activities_display) . '</p>';
    }
    
    return "
        <h2>New Safari Quote Request</h2>
        <p><strong>Quote Request ID:</strong> #{$quote_id}</p>
        <hr>
        
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> {$data['first_name']} {$data['last_name']}</p>
        <p><strong>Email:</strong> <a href=\"mailto:{$data['email']}\">{$data['email']}</a></p>
        <p><strong>Phone:</strong> {$phone}</p>
        <p><strong>Country:</strong> {$data['country']}</p>
        
        <h3>Safari Requirements</h3>
        <p><strong>Destination:</strong> {$data['destination']}</p>
        <p><strong>Duration:</strong> {$duration}</p>
        <p><strong>Group Size:</strong> {$data['group_size']} people</p>
        <p><strong>Travel Date:</strong> {$travel_date}</p>
        <p><strong>Budget Range:</strong> {$budget_range}</p>
        <p><strong>Accommodation Level:</strong> {$accommodation}</p>
        
        {$activities_list}
        
        " . (!empty($data['special_interests']) ? "<h3>Special Interests</h3><p>" . nl2br(htmlspecialchars($data['special_interests'])) . "</p>" : "") . "
        
        " . (!empty($data['dietary_requirements']) ? "<h3>Dietary Requirements</h3><p>" . nl2br(htmlspecialchars($data['dietary_requirements'])) . "</p>" : "") . "
        
        " . (!empty($data['mobility_requirements']) ? "<h3>Mobility Requirements</h3><p>" . nl2br(htmlspecialchars($data['mobility_requirements'])) . "</p>" : "") . "
        
        " . (!empty($data['additional_requirements']) ? "<h3>Additional Requirements</h3><p>" . nl2br(htmlspecialchars($data['additional_requirements'])) . "</p>" : "") . "
        
        " . (!empty($data['message']) ? "<h3>Additional Message</h3><p>" . nl2br(htmlspecialchars($data['message'])) . "</p>" : "") . "
        
        <h3>System Information</h3>
        <p><strong>Newsletter Subscription:</strong> " . ($data['newsletter_opt_in'] ? 'Yes' : 'No') . "</p>
        <p><strong>Submission Time:</strong> " . date('Y-m-d H:i:s T') . "</p>
        <p><strong>IP Address:</strong> " . getClientIp() . "</p>
        
        <hr>
        <p><em>Please prepare and send a customized quote within 48 hours.</em></p>
    ";
}
?>
