-- Phase 10: Notifications & Alerts
-- Tables: notifications, fraud_alerts

-- Enums
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE fraud_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'medium',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  reference_type VARCHAR(50),
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_tenant_user ON notifications(tenant_id, user_id);
CREATE INDEX idx_notifications_tenant_user_unread ON notifications(tenant_id, user_id) WHERE is_read = false;
CREATE INDEX idx_notifications_tenant_event ON notifications(tenant_id, event_type);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_tenant_isolation ON notifications
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Fraud Alerts
CREATE TABLE fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  alert_type VARCHAR(50) NOT NULL,
  severity fraud_severity NOT NULL DEFAULT 'medium',
  description TEXT NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  wager_id UUID,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_alerts_tenant ON fraud_alerts(tenant_id);
CREATE INDEX idx_fraud_alerts_tenant_unresolved ON fraud_alerts(tenant_id) WHERE is_resolved = false;
CREATE INDEX idx_fraud_alerts_tenant_type ON fraud_alerts(tenant_id, alert_type);

ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY fraud_alert_tenant_isolation ON fraud_alerts
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
