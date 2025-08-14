-- Gisu Safaris Backend Database Schema
-- PostgreSQL Database: gisusafaris_gisu_safaris_db
-- User: gisusafaris_gisu_admin

-- Set timezone to UTC
SET TIME ZONE 'UTC';

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin users table for backend access
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

-- Create contact submissions table
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

-- 2. Safari Package Bookings
CREATE TABLE package_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_type VARCHAR(50) NOT NULL, -- 'kenya-masai-mara', 'uganda-gorilla', etc.
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    country VARCHAR(100),
    travel_date DATE,
    group_size INTEGER NOT NULL,
    accommodation_level VARCHAR(50),
    special_requests TEXT,
    add_ons TEXT[], -- Array of selected add-ons
    estimated_price DECIMAL(10,2),
    booking_status VARCHAR(20) DEFAULT 'inquiry', -- inquiry, confirmed, cancelled
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, partial, failed
    whatsapp_sent BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Newsletter Subscriptions
CREATE TABLE newsletter_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    subscription_source VARCHAR(50) NOT NULL, -- 'blog', 'contact-form', 'footer'
    status VARCHAR(20) DEFAULT 'active', -- active, unsubscribed, bounced
    confirmed_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Rwanda Specific Bookings (WhatsApp Integration)
CREATE TABLE rwanda_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_type VARCHAR(50) NOT NULL, -- 'gorilla-trekking', 'golden-monkey', 'kigali-cultural'
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    travel_date DATE NOT NULL,
    group_size INTEGER NOT NULL,
    accommodation_level VARCHAR(50),
    cultural_interests TEXT[],
    nature_interests TEXT[],
    special_requests TEXT,
    whatsapp_message TEXT, -- The formatted WhatsApp message sent
    whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
    whatsapp_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, read
    booking_reference VARCHAR(20) UNIQUE,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Admin Users (for backend access)
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin', -- admin, manager, viewer
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Email Templates
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    template_variables JSONB, -- Variables that can be replaced in template
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. System Logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_level VARCHAR(20) NOT NULL, -- info, warning, error, debug
    message TEXT NOT NULL,
    context JSONB,
    ip_address INET,
    user_id UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Contact submissions indexes
CREATE INDEX idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX idx_contact_submissions_destination ON contact_submissions(destination);

-- Package bookings indexes
CREATE INDEX idx_package_bookings_email ON package_bookings(email);
CREATE INDEX idx_package_bookings_package_type ON package_bookings(package_type);
CREATE INDEX idx_package_bookings_created_at ON package_bookings(created_at DESC);
CREATE INDEX idx_package_bookings_booking_status ON package_bookings(booking_status);
CREATE INDEX idx_package_bookings_travel_date ON package_bookings(travel_date);

-- Newsletter subscriptions indexes
CREATE INDEX idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX idx_newsletter_subscriptions_status ON newsletter_subscriptions(status);
CREATE INDEX idx_newsletter_subscriptions_created_at ON newsletter_subscriptions(created_at DESC);

-- Rwanda bookings indexes
CREATE INDEX idx_rwanda_bookings_email ON rwanda_bookings(email);
CREATE INDEX idx_rwanda_bookings_booking_type ON rwanda_bookings(booking_type);
CREATE INDEX idx_rwanda_bookings_travel_date ON rwanda_bookings(travel_date);
CREATE INDEX idx_rwanda_bookings_reference ON rwanda_bookings(booking_reference);
CREATE INDEX idx_rwanda_bookings_created_at ON rwanda_bookings(created_at DESC);

-- Admin users indexes
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_is_active ON admin_users(is_active);

-- Email templates indexes
CREATE INDEX idx_email_templates_name ON email_templates(template_name);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);

-- System logs indexes
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_contact_submissions_updated_at BEFORE UPDATE ON contact_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_package_bookings_updated_at BEFORE UPDATE ON package_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscriptions_updated_at BEFORE UPDATE ON newsletter_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rwanda_bookings_updated_at BEFORE UPDATE ON rwanda_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- =============================================

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference(booking_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    prefix VARCHAR(3);
    random_part VARCHAR(10);
    reference VARCHAR(20);
BEGIN
    -- Set prefix based on booking type
    prefix := CASE 
        WHEN booking_type = 'gorilla-trekking' THEN 'RWG'
        WHEN booking_type = 'golden-monkey' THEN 'RWM'
        WHEN booking_type = 'kigali-cultural' THEN 'RWK'
        ELSE 'RWS'
    END;
    
    -- Generate random alphanumeric string
    random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Combine with timestamp
    reference := prefix || TO_CHAR(NOW(), 'YYMMDD') || random_part;
    
    RETURN reference;
END;
$$ LANGUAGE plpgsql;

-- Function to get booking statistics
CREATE OR REPLACE FUNCTION get_booking_stats(start_date DATE DEFAULT NULL, end_date DATE DEFAULT NULL)
RETURNS TABLE (
    total_contacts INTEGER,
    total_bookings INTEGER,
    total_rwanda_bookings INTEGER,
    newsletter_subscribers INTEGER,
    pending_inquiries INTEGER
) AS $$
BEGIN
    IF start_date IS NULL THEN
        start_date := CURRENT_DATE - INTERVAL '30 days';
    END IF;
    
    IF end_date IS NULL THEN
        end_date := CURRENT_DATE;
    END IF;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM contact_submissions 
         WHERE created_at::DATE BETWEEN start_date AND end_date),
        (SELECT COUNT(*)::INTEGER FROM package_bookings 
         WHERE created_at::DATE BETWEEN start_date AND end_date),
        (SELECT COUNT(*)::INTEGER FROM rwanda_bookings 
         WHERE created_at::DATE BETWEEN start_date AND end_date),
        (SELECT COUNT(*)::INTEGER FROM newsletter_subscriptions 
         WHERE status = 'active' AND created_at::DATE BETWEEN start_date AND end_date),
        (SELECT COUNT(*)::INTEGER FROM contact_submissions 
         WHERE status = 'pending' AND created_at::DATE BETWEEN start_date AND end_date);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INSERT INITIAL DATA
-- =============================================

-- Insert default admin user (password: Admin@123 - should be changed)
INSERT INTO admin_users (username, email, password_hash, role) VALUES 
('admin', 'admin@gisusafaris.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S5XS', 'admin');

-- Insert default email templates
INSERT INTO email_templates (template_name, subject, body_html, body_text, template_variables) VALUES 
(
    'contact_confirmation',
    'Thank you for your Safari Inquiry - Gisu Safaris',
    '<html><body><h2>Thank you for your interest in Gisu Safaris!</h2><p>Dear {{first_name}},</p><p>We have received your safari inquiry and our expert team will get back to you within 24 hours with a customized itinerary.</p><p>Your inquiry details:</p><ul><li>Destination: {{destination}}</li><li>Group Size: {{group_size}}</li><li>Preferred Travel Date: {{travel_date}}</li></ul><p>Best regards,<br>The Gisu Safaris Team</p></body></html>',
    'Thank you for your interest in Gisu Safaris! Dear {{first_name}}, we have received your safari inquiry and our expert team will get back to you within 24 hours.',
    '{"first_name": "string", "destination": "string", "group_size": "string", "travel_date": "string"}'
),
(
    'booking_confirmation',
    'Safari Booking Confirmation - {{package_type}} - Gisu Safaris',
    '<html><body><h2>Booking Confirmation</h2><p>Dear {{first_name}},</p><p>Thank you for booking the {{package_type}} safari with us!</p><p>Booking Reference: <strong>{{booking_reference}}</strong></p><p>We will contact you shortly to finalize the details.</p><p>Best regards,<br>Gisu Safaris Team</p></body></html>',
    'Dear {{first_name}}, Thank you for booking the {{package_type}} safari with us! Booking Reference: {{booking_reference}}',
    '{"first_name": "string", "package_type": "string", "booking_reference": "string"}'
);

-- Create views for reporting
CREATE VIEW booking_summary AS
SELECT 
    DATE_TRUNC('day', created_at) as booking_date,
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN booking_status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN booking_status = 'inquiry' THEN 1 END) as pending_inquiries,
    AVG(estimated_price) as avg_price
FROM package_bookings
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY booking_date DESC;

-- Grant necessary permissions (adjust for your cPanel user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cpanel_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cpanel_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO cpanel_user;

COMMIT;
