ALTER TABLE notification_outbox
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
