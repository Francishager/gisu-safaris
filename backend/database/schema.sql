-- Gisu Safaris Backend Database Schema
-- PostgreSQL Database: gisusafaris_gisu_safaris_db
-- User: gisusafaris_gisu_admin

-- Set timezone to UTC
SET TIME ZONE 'UTC';

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector for semantic search (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

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

-- Car Hire Enquiries
CREATE TABLE IF NOT EXISTS car_hire_enquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100),
    subject VARCHAR(200) NOT NULL,
    enquiry_type VARCHAR(50) NOT NULL, -- car_hire_booking | car_hire_custom
    vehicle_type VARCHAR(50),
    rental_option VARCHAR(50),
    pickup_date DATE,
    return_date DATE,
    passengers VARCHAR(20),
    pickup_location VARCHAR(100),
    dropoff_location VARCHAR(100),
    license VARCHAR(100),
    notes TEXT,
    requirements TEXT,
    referrer_page TEXT,
    ip_address INET,
    user_agent TEXT,
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
    paid_amount DECIMAL(10,2),
    paid_at TIMESTAMP WITH TIME ZONE,
    stripe_session_id VARCHAR(100),
    stripe_payment_intent_id VARCHAR(100),
    whatsapp_sent BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Payments (legacy schema - disabled)
-- NOTE: A newer generic `payments` table is defined later in this file with
-- fields for Stripe session/intent IDs, status, receipt_url, etc.
-- Keeping this legacy block commented for reference to avoid duplicate table creation.
--
-- CREATE TABLE payments (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     package_booking_id UUID NOT NULL REFERENCES package_bookings(id),
--     payment_method VARCHAR(50) NOT NULL, -- 'stripe', 'bank-transfer', etc.
--     payment_status VARCHAR(20) NOT NULL, -- 'pending', 'paid', 'failed'
--     amount DECIMAL(10,2) NOT NULL,
--     payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
--     payment_reference VARCHAR(100) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

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

-- Car hire enquiries indexes
CREATE INDEX IF NOT EXISTS idx_car_hire_enquiries_email ON car_hire_enquiries(email);
CREATE INDEX IF NOT EXISTS idx_car_hire_enquiries_created_at ON car_hire_enquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_car_hire_enquiries_type ON car_hire_enquiries(enquiry_type);

-- Chat analytics tables
CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    visitor_name VARCHAR(120),
    visitor_email VARCHAR(255),
    consent_transcript BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    page TEXT,
    referrer TEXT,
    utm_source VARCHAR(120),
    utm_medium VARCHAR(120),
    utm_campaign VARCHAR(200),
    utm_term VARCHAR(200),
    utm_content VARCHAR(200),
    device TEXT,
    locale VARCHAR(20),
    tz_offset_minutes INTEGER,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    messages_total INTEGER,
    user_msgs INTEGER,
    bot_msgs INTEGER,
    lead_score INTEGER,
    booking_intent BOOLEAN,
    package_interest VARCHAR(200),
    preferences JSONB DEFAULT '{}'::jsonb,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL CHECK (sender IN ('user','bot')),
    message TEXT NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_email ON chat_sessions(visitor_email);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_time ON chat_messages(occurred_at DESC);

-- Package bookings indexes
CREATE INDEX idx_package_bookings_email ON package_bookings(email);
CREATE INDEX idx_package_bookings_package_type ON package_bookings(package_type);
CREATE INDEX idx_package_bookings_created_at ON package_bookings(created_at DESC);
CREATE INDEX idx_package_bookings_booking_status ON package_bookings(booking_status);
CREATE INDEX idx_package_bookings_travel_date ON package_bookings(travel_date);
CREATE INDEX IF NOT EXISTS idx_package_bookings_payment_status ON package_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_package_bookings_stripe ON package_bookings(stripe_session_id, stripe_payment_intent_id);

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

CREATE TRIGGER update_car_hire_enquiries_updated_at BEFORE UPDATE ON car_hire_enquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
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

-- 8. Chat Analytics
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(64) UNIQUE NOT NULL,
    visitor_name VARCHAR(150),
    visitor_email VARCHAR(255),
    consent_transcript BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    page TEXT,
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(150),
    utm_term VARCHAR(150),
    utm_content VARCHAR(150),
    device VARCHAR(150),
    locale VARCHAR(20),
    tz_offset_minutes INTEGER,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    messages_total INTEGER DEFAULT 0,
    user_msgs INTEGER DEFAULT 0,
    bot_msgs INTEGER DEFAULT 0,
    lead_score INTEGER,
    booking_intent BOOLEAN,
    package_interest VARCHAR(200),
    preferences JSONB,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(64) NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL, -- 'user' | 'bot'
    message TEXT NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_started_at ON chat_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_booking_intent ON chat_sessions(booking_intent);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_utm ON chat_sessions(utm_source, utm_medium, utm_campaign);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_time ON chat_messages(session_id, occurred_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID,
    booking_type VARCHAR(30), -- safari|hotel|service|custom
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL, -- pending|succeeded|failed|refunded|partial
    stripe_session_id VARCHAR(100) UNIQUE,
    stripe_payment_intent_id VARCHAR(100),
    receipt_url TEXT,
    customer_email VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (adjust for your cPanel user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cpanel_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cpanel_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO cpanel_user;

-- =============================================
-- ANALYTICS VIEWS: DAILY ROLLUPS FOR DASHBOARDS
-- =============================================

-- Chat sessions per day with engagement metrics
CREATE OR REPLACE VIEW chat_sessions_daily AS
SELECT
    DATE_TRUNC('day', COALESCE(started_at, created_at))::date AS day,
    COUNT(*)::int AS total_sessions,
    COALESCE(AVG(NULLIF(duration_seconds,0)), 0)::numeric(10,2) AS avg_duration_seconds,
    COALESCE(AVG(messages_total), 0)::numeric(10,2) AS avg_messages_total,
    COALESCE(AVG(user_msgs), 0)::numeric(10,2) AS avg_user_msgs,
    COALESCE(AVG(bot_msgs), 0)::numeric(10,2) AS avg_bot_msgs,
    COUNT(*) FILTER (WHERE booking_intent IS TRUE OR COALESCE(lead_score,0) >= 70)::int AS hot_leads,
    COALESCE(AVG(NULLIF(lead_score,0)), 0)::numeric(10,2) AS avg_lead_score
FROM chat_sessions
GROUP BY 1
ORDER BY 1 DESC;

-- Chat sessions UTM breakdown per day
CREATE OR REPLACE VIEW chat_sessions_utm_daily AS
SELECT
    DATE_TRUNC('day', COALESCE(started_at, created_at))::date AS day,
    COALESCE(utm_source, 'unknown') AS utm_source,
    COALESCE(utm_medium, 'unknown') AS utm_medium,
    COALESCE(utm_campaign, 'unknown') AS utm_campaign,
    COUNT(*)::int AS sessions,
    COUNT(*) FILTER (WHERE booking_intent IS TRUE OR COALESCE(lead_score,0) >= 70)::int AS hot_leads
FROM chat_sessions
GROUP BY 1,2,3,4
ORDER BY 1 DESC, sessions DESC;

-- Chat messages per day by sender
CREATE OR REPLACE VIEW chat_messages_daily AS
SELECT
    DATE_TRUNC('day', COALESCE(occurred_at, created_at))::date AS day,
    sender,
    COUNT(*)::int AS messages
FROM chat_messages
GROUP BY 1,2
ORDER BY 1 DESC, 3 DESC;

-- Chat conversion rate per day
CREATE OR REPLACE VIEW chat_conversion_daily AS
SELECT
    d.day,
    d.total_sessions,
    d.hot_leads,
    CASE WHEN d.total_sessions > 0 THEN ROUND((d.hot_leads::numeric / d.total_sessions::numeric) * 100.0, 2) ELSE 0 END AS hot_lead_rate_pct
FROM chat_sessions_daily d
ORDER BY d.day DESC;

COMMIT;

-- =============================================
-- RAG KNOWLEDGE BASE (DOCUMENTS + CHUNKS)
-- =============================================

-- Documents metadata table
CREATE TABLE IF NOT EXISTS knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(80) NOT NULL, -- 'website','blog','package','faq','manual'
    title TEXT NOT NULL,
    url TEXT,
    language VARCHAR(10) DEFAULT 'en',
    tags TEXT[],
    checksum VARCHAR(64), -- for dedupe
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chunked content with embeddings (1536-dim for text-embedding-3-small)
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    doc_id UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (doc_id, chunk_index)
);

-- Vector index for fast ANN search (requires pgvector >= 0.5)
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_doc ON knowledge_chunks(doc_id);

-- Triggers
CREATE TRIGGER update_knowledge_documents_updated_at BEFORE UPDATE ON knowledge_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
