<?php
/**
 * Newsletter Subscription API Endpoint
 * Handles newsletter subscriptions from blog and other forms
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
logEvent('info', 'Newsletter subscription API accessed', ['method' => 'POST']);

try {
    // Get and decode JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(null, 400, 'Invalid JSON data');
    }
    
    // Validate required fields
    if (empty($input['email'])) {
        sendJsonResponse(null, 400, 'Email address is required');
    }
    
    // Sanitize and validate email
    $email = filter_var(trim($input['email']), FILTER_SANITIZE_EMAIL);
    
    if (!isValidEmail($email)) {
        sendJsonResponse(null, 400, 'Invalid email address format');
    }
    
    // Get subscription source
    $source = sanitizeInput($input['source'] ?? 'blog');
    
    // Validate source
    $allowed_sources = ['blog', 'contact-form', 'footer', 'popup', 'manual'];
    if (!in_array($source, $allowed_sources)) {
        $source = 'blog';
    }
    
    // Get database connection
    $db = getDbConnection();
    
    // Check if email already exists
    $stmt = $db->prepare("
        SELECT id, status, subscription_source, created_at 
        FROM newsletter_subscriptions 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        if ($existing['status'] === 'active') {
            sendJsonResponse([
                'already_subscribed' => true,
                'subscription_date' => $existing['created_at']
            ], 200, 'You are already subscribed to our newsletter');
        } else {
            // Reactivate subscription
            $stmt = $db->prepare("
                UPDATE newsletter_subscriptions 
                SET status = 'active', 
                    subscription_source = ?,
                    confirmed_at = CURRENT_TIMESTAMP,
                    unsubscribed_at = NULL,
                    updated_at = CURRENT_TIMESTAMP,
                    ip_address = ?,
                    user_agent = ?
                WHERE email = ?
            ");
            $stmt->execute([
                $source,
                getClientIp(),
                $_SERVER['HTTP_USER_AGENT'] ?? '',
                $email
            ]);
            
            $subscription_id = $existing['id'];
            $action = 'reactivated';
        }
    } else {
        // Create new subscription
        $stmt = $db->prepare("
            INSERT INTO newsletter_subscriptions (
                email, subscription_source, confirmed_at, 
                ip_address, user_agent
            ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
            RETURNING id
        ");
        
        $stmt->execute([
            $email,
            $source,
            getClientIp(),
            $_SERVER['HTTP_USER_AGENT'] ?? ''
        ]);
        
        $result = $stmt->fetch();
        $subscription_id = $result['id'];
        $action = 'subscribed';
    }
    
    // Send welcome email to subscriber
    try {
        $welcome_subject = 'Welcome to Gisu Safaris Newsletter - Your Safari Adventure Awaits!';
        $welcome_message = generateWelcomeEmail($email);
        
        sendEmail(
            $email,
            '',
            $welcome_subject,
            $welcome_message,
            strip_tags($welcome_message)
        );
        
        logEvent('info', 'Newsletter welcome email sent', [
            'email' => $email,
            'subscription_id' => $subscription_id
        ]);
        
    } catch (Exception $e) {
        logEvent('error', 'Failed to send newsletter welcome email', [
            'email' => $email,
            'subscription_id' => $subscription_id,
            'error' => $e->getMessage()
        ]);
    }
    
    // Send notification to admin
    try {
        if ($action === 'subscribed') {
            $admin_subject = "New Newsletter Subscription - {$email}";
            $admin_message = "
                <h3>New Newsletter Subscription</h3>
                <p><strong>Email:</strong> {$email}</p>
                <p><strong>Source:</strong> {$source}</p>
                <p><strong>Subscription Time:</strong> " . date('Y-m-d H:i:s T') . "</p>
                <p><strong>IP Address:</strong> " . getClientIp() . "</p>
            ";
            
            sendEmail(
                ADMIN_EMAIL,
                'Gisu Safaris Admin',
                $admin_subject,
                $admin_message,
                strip_tags($admin_message)
            );
        }
        
    } catch (Exception $e) {
        logEvent('warning', 'Failed to send newsletter admin notification', [
            'email' => $email,
            'error' => $e->getMessage()
        ]);
    }
    
    // Log successful subscription
    logEvent('info', 'Newsletter subscription processed', [
        'subscription_id' => $subscription_id,
        'email' => $email,
        'source' => $source,
        'action' => $action
    ]);
    
    // Return success response
    sendJsonResponse([
        'subscription_id' => $subscription_id,
        'email' => $email,
        'action' => $action,
        'message' => $action === 'subscribed' 
            ? 'Thank you for subscribing! Check your email for a welcome message.'
            : 'Your newsletter subscription has been reactivated!'
    ], 200, 'Newsletter subscription successful');
    
} catch (PDOException $e) {
    logEvent('error', 'Database error in newsletter subscription', [
        'error' => $e->getMessage(),
        'code' => $e->getCode(),
        'email' => $email ?? 'unknown'
    ]);
    sendJsonResponse(null, 500, 'Database error occurred');
    
} catch (Exception $e) {
    logEvent('error', 'General error in newsletter subscription', [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'email' => $email ?? 'unknown'
    ]);
    sendJsonResponse(null, 500, 'An error occurred while processing your subscription');
}

/**
 * Generate welcome email for newsletter subscription
 */
function generateWelcomeEmail($email) {
    $unsubscribe_link = FRONTEND_URL . "/unsubscribe?email=" . urlencode($email);
    
    $html = "
    <html>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;'>
        <div style='background: linear-gradient(135deg, #2E7D32, #4CAF50); padding: 40px 20px; text-align: center; color: white;'>
            <h1 style='margin: 0; font-size: 28px;'>Welcome to Gisu Safaris!</h1>
            <p style='margin: 10px 0 0; font-size: 16px; opacity: 0.9;'>Your Gateway to East Africa's Ultimate Safari Adventures</p>
        </div>
        
        <div style='padding: 30px 20px;'>
            <h2 style='color: #2E7D32; margin-bottom: 20px;'>Thank You for Joining Our Safari Community!</h2>
            
            <p>We're thrilled to have you on board for an incredible journey through East Africa's most spectacular wildlife destinations.</p>
            
            <div style='background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;'>
                <h3 style='color: #2E7D32; margin-top: 0;'>What to Expect:</h3>
                <ul style='margin: 0; padding-left: 20px;'>
                    <li style='margin-bottom: 10px;'><strong>Expert Safari Tips:</strong> Insider knowledge for unforgettable wildlife encounters</li>
                    <li style='margin-bottom: 10px;'><strong>Conservation Stories:</strong> Learn about our wildlife protection efforts</li>
                    <li style='margin-bottom: 10px;'><strong>Exclusive Offers:</strong> Special deals and early access to new packages</li>
                    <li style='margin-bottom: 10px;'><strong>Travel Guides:</strong> Practical advice for East African adventures</li>
                    <li><strong>Seasonal Updates:</strong> Best times to visit for Great Migration and more</li>
                </ul>
            </div>
            
            <div style='text-align: center; margin: 30px 0;'>
                <h3 style='color: #2E7D32;'>Ready to Start Planning?</h3>
                <p>Explore our most popular safari packages:</p>
                
                <div style='display: inline-block; margin: 10px; text-align: left;'>
                    <a href='" . FRONTEND_URL . "/packages/uganda.html' style='display: inline-block; background: #2E7D32; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; margin: 5px;'>🦍 Uganda Gorilla Trekking</a>
                    <a href='" . FRONTEND_URL . "/packages/kenya.html' style='display: inline-block; background: #FF9800; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; margin: 5px;'>🦁 Kenya Big Five Safari</a>
                    <a href='" . FRONTEND_URL . "/packages/tanzania.html' style='display: inline-block; background: #3F51B5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; margin: 5px;'>🐘 Tanzania Serengeti</a>
                    <a href='" . FRONTEND_URL . "/packages/rwanda.html' style='display: inline-block; background: #E91E63; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; margin: 5px;'>🏔️ Rwanda Volcanoes</a>
                </div>
            </div>
            
            <div style='background: linear-gradient(135deg, #E8F5E8, #C8E6C9); padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;'>
                <h3 style='color: #2E7D32; margin-top: 0;'>🌍 Our Commitment to Conservation</h3>
                <p style='margin-bottom: 15px;'>Every safari with Gisu Safaris directly supports wildlife conservation and local communities. Together, we're protecting East Africa's incredible biodiversity for future generations.</p>
                <p style='margin: 0; font-weight: bold; color: #2E7D32;'>Your adventure makes a difference!</p>
            </div>
            
            <div style='text-align: center; margin: 30px 0;'>
                <h3 style='color: #2E7D32;'>Stay Connected</h3>
                <p>Follow us for daily safari inspiration:</p>
                <div>
                    <a href='#' style='display: inline-block; margin: 0 10px; color: #3b5998; font-size: 24px; text-decoration: none;'>📘 Facebook</a>
                    <a href='#' style='display: inline-block; margin: 0 10px; color: #e1306c; font-size: 24px; text-decoration: none;'>📷 Instagram</a>
                    <a href='#' style='display: inline-block; margin: 0 10px; color: #1da1f2; font-size: 24px; text-decoration: none;'>🐦 Twitter</a>
                    <a href='#' style='display: inline-block; margin: 0 10px; color: #ff0000; font-size: 24px; text-decoration: none;'>📺 YouTube</a>
                </div>
            </div>
            
            <div style='border-top: 2px solid #2E7D32; padding-top: 20px; margin-top: 30px; text-align: center;'>
                <p style='color: #666; margin-bottom: 10px;'>Questions? We're here to help!</p>
                <p style='margin: 5px 0;'>📧 <a href='mailto:info@gisusafaris.com' style='color: #2E7D32;'>info@gisusafaris.com</a></p>
                <p style='margin: 5px 0;'>📱 <a href='https://wa.me/256780950555' style='color: #25D366;'>WhatsApp: +256 780 950 555</a></p>
                <p style='margin: 5px 0;'>🌐 <a href='" . FRONTEND_URL . "' style='color: #2E7D32;'>gisusafaris.com</a></p>
            </div>
        </div>
        
        <div style='background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;'>
            <p style='color: #6c757d; font-size: 12px; margin: 0 0 10px;'>
                You received this email because you subscribed to the Gisu Safaris newsletter.
            </p>
            <p style='color: #6c757d; font-size: 12px; margin: 0;'>
                <a href='{$unsubscribe_link}' style='color: #6c757d;'>Unsubscribe</a> | 
                <a href='" . FRONTEND_URL . "/contact.html' style='color: #6c757d;'>Contact Us</a> |
                <a href='" . FRONTEND_URL . "' style='color: #6c757d;'>Visit Website</a>
            </p>
            <p style='color: #6c757d; font-size: 11px; margin: 15px 0 0;'>
                © " . date('Y') . " Gisu Safaris. All rights reserved.<br>
                Uganda's Leading Sustainable Safari Company
            </p>
        </div>
    </body>
    </html>
    ";
    
    return $html;
}
?>
