-- Gisu Safaris Backend Database Schema
-- PostgreSQL Database: gisusafaris_gisu_safaris_db
-- User: gisusafaris_gisu_admin
-- Password: x~}PqR+ZQu,r_)V5

-- This file should be run in your cPanel PostgreSQL console

-- Set timezone to UTC
SET TIME ZONE 'UTC';

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MAIN TABLES FOR GISU SAFARIS BACKEND
-- =============================================

-- 1. Admin Users Table (for backend access)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Contact Form Submissions (contact.php API)
CREATE TABLE IF NOT EXISTS contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    group_size VARCHAR(20) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    duration VARCHAR(50),
    budget VARCHAR(50),
    travel_date DATE,
    interests JSONB DEFAULT '[]',
    message TEXT,
    newsletter_opt_in BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'new',
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Safari Bookings (booking.php API)
CREATE TABLE IF NOT EXISTS safari_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    package_type VARCHAR(100) DEFAULT 'uganda-safari',
    duration VARCHAR(50),
    group_size VARCHAR(20) NOT NULL,
    travel_date DATE,
    budget VARCHAR(50),
    accommodation_level VARCHAR(50),
    special_requirements TEXT,
    message TEXT,
    newsletter_opt_in BOOLEAN DEFAULT false,
    booking_status VARCHAR(20) DEFAULT 'pending',
    payment_status VARCHAR(20) DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. General Enquiries (enquiry.php API)
CREATE TABLE IF NOT EXISTS general_enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    enquiry_type VARCHAR(50) DEFAULT 'general',
    message TEXT NOT NULL,
    newsletter_opt_in BOOLEAN DEFAULT false,
    referrer_page VARCHAR(255),
    status VARCHAR(20) DEFAULT 'new',
    assigned_to UUID REFERENCES admin_users(id),
    response_sent BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Quote Requests (quote.php API)
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100) NOT NULL,
    group_size VARCHAR(20) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    duration VARCHAR(50),
    budget_range VARCHAR(50),
    travel_date DATE,
    accommodation_level VARCHAR(50),
    activities JSONB DEFAULT '[]',
    special_interests TEXT,
    dietary_requirements TEXT,
    mobility_requirements TEXT,
    additional_requirements TEXT,
    message TEXT,
    newsletter_opt_in BOOLEAN DEFAULT false,
    quote_status VARCHAR(20) DEFAULT 'pending',
    quote_amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    quote_sent BOOLEAN DEFAULT false,
    quote_sent_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    referrer_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Newsletter Subscriptions (newsletter.php API)
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    subscription_source VARCHAR(50) DEFAULT 'website',
    confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    bounce_count INTEGER DEFAULT 0,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. System Logs (for application logging)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    ip_address INET,
    user_id UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Email Templates (for automated emails)
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Email Logs (track sent emails)
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_email VARCHAR(255) NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Contact submissions indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_destination ON contact_submissions(destination);

-- Safari bookings indexes
CREATE INDEX IF NOT EXISTS idx_safari_bookings_email ON safari_bookings(email);
CREATE INDEX IF NOT EXISTS idx_safari_bookings_created_at ON safari_bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safari_bookings_status ON safari_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_safari_bookings_package ON safari_bookings(package_name);
CREATE INDEX IF NOT EXISTS idx_safari_bookings_travel_date ON safari_bookings(travel_date);

-- General enquiries indexes
CREATE INDEX IF NOT EXISTS idx_general_enquiries_email ON general_enquiries(email);
CREATE INDEX IF NOT EXISTS idx_general_enquiries_created_at ON general_enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_general_enquiries_status ON general_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_general_enquiries_type ON general_enquiries(enquiry_type);

-- Quote requests indexes
CREATE INDEX IF NOT EXISTS idx_quote_requests_email ON quote_requests(email);
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON quote_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(quote_status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_destination ON quote_requests(destination);

-- Newsletter subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_status ON newsletter_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_created_at ON newsletter_subscriptions(created_at DESC);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_ip_address ON system_logs(ip_address);

-- Email logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- =============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need automatic updated_at updates
CREATE TRIGGER update_admin_users_updated_at 
    BEFORE UPDATE ON admin_users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contact_submissions_updated_at 
    BEFORE UPDATE ON contact_submissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safari_bookings_updated_at 
    BEFORE UPDATE ON safari_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_general_enquiries_updated_at 
    BEFORE UPDATE ON general_enquiries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_requests_updated_at 
    BEFORE UPDATE ON quote_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscriptions_updated_at 
    BEFORE UPDATE ON newsletter_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA INSERTION
-- =============================================

-- Insert default admin user (password: 'admin123' - CHANGE THIS IN PRODUCTION!)
INSERT INTO admin_users (username, email, password_hash, first_name, last_name, role)
VALUES (
    'admin',
    'admin@gisusafaris.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of 'admin123'
    'System',
    'Administrator',
    'super_admin'
) ON CONFLICT (username) DO NOTHING;

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, text_content)
VALUES 
(
    'contact_confirmation',
    'Thank you for contacting Gisu Safaris - {{destination}} Inquiry',
    '<h2>Thank You for Your Interest!</h2><p>Dear {{first_name}},</p><p>Thank you for contacting Gisu Safaris regarding your {{destination}} safari experience.</p>',
    'Dear {{first_name}}, Thank you for contacting Gisu Safaris regarding your {{destination}} safari experience.'
),
(
    'booking_confirmation',
    'Safari Booking Received - {{package_name}} - Booking #{{booking_id}}',
    '<h2>Booking Confirmation</h2><p>Dear {{first_name}},</p><p>Your safari booking for {{package_name}} has been received!</p>',
    'Dear {{first_name}}, Your safari booking for {{package_name}} has been received!'
),
(
    'enquiry_confirmation',
    'Enquiry Received - {{subject}} - Reference #{{enquiry_id}}',
    '<h2>Enquiry Received</h2><p>Dear {{first_name}},</p><p>Thank you for your enquiry regarding "{{subject}}".</p>',
    'Dear {{first_name}}, Thank you for your enquiry regarding "{{subject}}".'
),
(
    'quote_confirmation',
    'Quote Request Received - {{destination}} Safari - Quote #{{quote_id}}',
    '<h2>Quote Request Received</h2><p>Dear {{first_name}},</p><p>Thank you for requesting a custom quote for your {{destination}} safari.</p>',
    'Dear {{first_name}}, Thank you for requesting a custom quote for your {{destination}} safari.'
)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- USEFUL VIEWS FOR REPORTING
-- =============================================

-- Active newsletter subscribers view
CREATE OR REPLACE VIEW active_newsletter_subscribers AS
SELECT 
    email,
    subscription_source,
    confirmed_at,
    created_at
FROM newsletter_subscriptions 
WHERE status = 'active';

-- Recent contact submissions view (last 30 days)
CREATE OR REPLACE VIEW recent_contact_submissions AS
SELECT 
    id,
    first_name,
    last_name,
    email,
    destination,
    group_size,
    travel_date,
    status,
    created_at
FROM contact_submissions 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Pending bookings view
CREATE OR REPLACE VIEW pending_bookings AS
SELECT 
    id,
    first_name,
    last_name,
    email,
    package_name,
    travel_date,
    booking_status,
    payment_status,
    total_amount,
    created_at
FROM safari_bookings 
WHERE booking_status = 'pending'
ORDER BY created_at DESC;

-- Pending quote requests view
CREATE OR REPLACE VIEW pending_quotes AS
SELECT 
    id,
    first_name,
    last_name,
    email,
    destination,
    group_size,
    travel_date,
    quote_status,
    created_at
FROM quote_requests 
WHERE quote_status = 'pending'
ORDER BY created_at DESC;

-- =============================================
-- BUSINESS LOGIC FUNCTIONS
-- =============================================

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_contacts INTEGER,
    total_bookings INTEGER,
    total_quotes INTEGER,
    total_enquiries INTEGER,
    newsletter_subscribers INTEGER,
    pending_items INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM contact_submissions 
         WHERE created_at >= CURRENT_DATE - INTERVAL concat(days_back, ' days')),
        (SELECT COUNT(*)::INTEGER FROM safari_bookings 
         WHERE created_at >= CURRENT_DATE - INTERVAL concat(days_back, ' days')),
        (SELECT COUNT(*)::INTEGER FROM quote_requests 
         WHERE created_at >= CURRENT_DATE - INTERVAL concat(days_back, ' days')),
        (SELECT COUNT(*)::INTEGER FROM general_enquiries 
         WHERE created_at >= CURRENT_DATE - INTERVAL concat(days_back, ' days')),
        (SELECT COUNT(*)::INTEGER FROM newsletter_subscriptions WHERE status = 'active'),
        (SELECT COUNT(*)::INTEGER FROM contact_submissions WHERE status = 'new') +
        (SELECT COUNT(*)::INTEGER FROM safari_bookings WHERE booking_status = 'pending') +
        (SELECT COUNT(*)::INTEGER FROM quote_requests WHERE quote_status = 'pending') +
        (SELECT COUNT(*)::INTEGER FROM general_enquiries WHERE status = 'new');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TABLE COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON DATABASE gisusafaris_gisu_safaris_db IS 'Gisu Safaris website backend database';
COMMENT ON TABLE contact_submissions IS 'Main contact form submissions from the website';
COMMENT ON TABLE safari_bookings IS 'Safari package bookings and reservations';
COMMENT ON TABLE general_enquiries IS 'General enquiry form submissions';
COMMENT ON TABLE quote_requests IS 'Custom safari quote requests';
COMMENT ON TABLE newsletter_subscriptions IS 'Email newsletter subscribers';
COMMENT ON TABLE system_logs IS 'Application system logs and events';
COMMENT ON TABLE admin_users IS 'Backend administrative users';
COMMENT ON TABLE email_templates IS 'Email templates for automated messages';
COMMENT ON TABLE email_logs IS 'Log of all emails sent by the system';

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

-- Show created tables
SELECT 
    'Database setup completed!' as status,
    COUNT(*) as tables_created
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'admin_users', 'contact_submissions', 'safari_bookings', 
        'general_enquiries', 'quote_requests', 'newsletter_subscriptions', 
        'system_logs', 'email_templates', 'email_logs'
    );

-- Show available views
SELECT 
    table_name as available_views
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'VIEW';

COMMIT;
