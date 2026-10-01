-- LegalSync Database Schema
-- PostgreSQL Schema for MVP

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    firm_name VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expires_at TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Connections Table
CREATE TABLE oauth_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'microsoft'
    provider_user_id VARCHAR(255),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
);

-- Integrations Table
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- 'clio', 'google_calendar', 'outlook'
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    webhook_secret VARCHAR(255),
    status VARCHAR(50) DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, integration_type)
);

-- Calendar Mappings Table
CREATE TABLE calendar_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL,
    calendar_name VARCHAR(255),
    is_selected BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-calendar event mapping (one Clio event can live in several calendars)
CREATE TABLE calendar_event_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, integration_id, calendar_id)
);

-- Events Table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clio_event_id VARCHAR(255),
    google_event_id VARCHAR(255),
    outlook_event_id VARCHAR(255),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    location VARCHAR(500),
    attendees JSONB,
    recurrence_rule TEXT,
    case_name VARCHAR(255),
    case_id VARCHAR(255),
    synced_snapshot JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync History Table
CREATE TABLE sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_integration_id UUID REFERENCES integrations(id),
    target_integration_id UUID REFERENCES integrations(id),
    sync_type VARCHAR(50) NOT NULL, -- 'clio_to_google', 'clio_to_outlook', 'google_to_clio', 'outlook_to_clio'
    events_synced INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL, -- 'success', 'warning', 'error'
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Conflicts Table
CREATE TABLE conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    conflict_type VARCHAR(50) NOT NULL, -- 'modification_conflict'
    clio_version JSONB,
    calendar_version JSONB,
    resolution VARCHAR(50), -- 'last_write_wins', 'manual'
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions Table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL, -- 'solo', 'small_firm', 'mid_firm', 'enterprise'
    status VARCHAR(50) DEFAULT 'trial', -- 'trial', 'active', 'expired', 'cancelled', 'past_due', 'pending_payment', 'failed'
    payment_method VARCHAR(50), -- 'stripe', 'crypto'
    crypto_charge_code VARCHAR(255),
    trial_ends_at TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_crypto_charge_code ON subscriptions(crypto_charge_code);

-- Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    stripe_invoice_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Settings Table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sync_frequency INTEGER DEFAULT 5, -- minutes
    conflict_resolution_rule VARCHAR(50) DEFAULT 'last_write_wins',
    email_notifications BOOLEAN DEFAULT TRUE,
    sync_failure_notifications BOOLEAN DEFAULT TRUE,
    conflict_notifications BOOLEAN DEFAULT TRUE,
    daily_summary BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Processed provider webhooks, used to ignore duplicate deliveries
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, event_id)
);

-- Audit Log Table
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_oauth_connections_user_id ON oauth_connections(user_id);
CREATE INDEX idx_integrations_user_id ON integrations(user_id);
CREATE INDEX idx_integrations_type ON integrations(integration_type);
CREATE INDEX idx_calendar_mappings_user_id ON calendar_mappings(user_id);
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_clio_id ON events(clio_event_id);
CREATE INDEX idx_events_google_id ON events(google_event_id);
CREATE INDEX idx_events_outlook_id ON events(outlook_event_id);
CREATE INDEX idx_sync_history_user_id ON sync_history(user_id);
CREATE INDEX idx_sync_history_created_at ON sync_history(created_at DESC);
CREATE INDEX idx_calendar_event_map_user_id ON calendar_event_map(user_id);
CREATE INDEX idx_calendar_event_map_provider_event ON calendar_event_map(provider_event_id);

-- Idempotency guarantees used by the sync engine ON CONFLICT clauses.
-- Postgres treats NULLs as distinct in unique indexes, so partial rows are fine.
CREATE UNIQUE INDEX idx_events_user_clio_event ON events(user_id, clio_event_id);
CREATE UNIQUE INDEX idx_events_user_google_event ON events(user_id, google_event_id);
CREATE UNIQUE INDEX idx_events_user_outlook_event ON events(user_id, outlook_event_id);
CREATE UNIQUE INDEX idx_calendar_mappings_unique ON calendar_mappings(user_id, integration_id, calendar_id);
CREATE INDEX idx_conflicts_user_id ON conflicts(user_id);
CREATE INDEX idx_conflicts_resolved ON conflicts(resolved_at);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- Trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON oauth_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_mappings_updated_at BEFORE UPDATE ON calendar_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_event_map_updated_at BEFORE UPDATE ON calendar_event_map
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Idempotent migrations for databases created before billing columns existed
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS crypto_charge_code VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_subscriptions_crypto_charge_code ON subscriptions(crypto_charge_code);

-- Migrations for databases created before the sync idempotency work
ALTER TABLE events ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE events ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS synced_snapshot JSONB;

CREATE TABLE IF NOT EXISTS calendar_event_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    calendar_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_event_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, integration_id, calendar_id)
);

-- Remove pre-existing duplicates so the unique indexes below can be created.
DELETE FROM calendar_mappings a
USING calendar_mappings b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.integration_id = b.integration_id
  AND a.calendar_id = b.calendar_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_user_clio_event ON events(user_id, clio_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_user_google_event ON events(user_id, google_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_user_outlook_event ON events(user_id, outlook_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_mappings_unique ON calendar_mappings(user_id, integration_id, calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_map_user_id ON calendar_event_map(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_map_provider_event ON calendar_event_map(provider_event_id);

-- Only one unresolved conflict should exist per event at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conflicts_open_event
  ON conflicts(event_id) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, event_id)
);
