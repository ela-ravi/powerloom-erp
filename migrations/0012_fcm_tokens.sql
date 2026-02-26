-- Phase: FCM Push Notifications
-- Add device token storage for push notifications

ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR(500);
CREATE INDEX idx_users_fcm_token ON users(tenant_id) WHERE fcm_token IS NOT NULL;
