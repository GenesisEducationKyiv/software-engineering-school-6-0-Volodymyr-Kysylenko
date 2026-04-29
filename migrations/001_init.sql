CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  repo_owner TEXT NOT NULL,
  repo_name TEXT NOT NULL,
  repo_full_name TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirm_token TEXT NOT NULL UNIQUE,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  last_seen_tag TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  CONSTRAINT subscriptions_email_repo_unique UNIQUE (email, repo_full_name)
);

CREATE INDEX IF NOT EXISTS subscriptions_active_repo_idx
  ON subscriptions (repo_full_name)
  WHERE unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS subscriptions_email_idx
  ON subscriptions (email);
