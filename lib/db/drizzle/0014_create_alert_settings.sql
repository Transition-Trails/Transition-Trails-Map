-- Migration 0014: Create alert_settings singleton table
--
-- Stores admin-configurable error-alert threshold and window so admins can
-- tune the errorAlertJob without touching Replit Secrets.
-- The env var ERROR_ALERT_THRESHOLD remains as a fallback.

CREATE TABLE IF NOT EXISTS alert_settings (
  id             TEXT PRIMARY KEY DEFAULT 'default',
  threshold      INTEGER NOT NULL DEFAULT 10,
  window_minutes INTEGER NOT NULL DEFAULT 15,
  updated_by     TEXT,
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seed the default row so GET always returns a value.
INSERT INTO alert_settings (id, threshold, window_minutes)
VALUES ('default', 10, 15)
ON CONFLICT (id) DO NOTHING;
