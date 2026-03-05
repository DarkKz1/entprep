-- Push notification subscriptions (Web Push API)
-- One user can have multiple subscriptions (phone + desktop, multiple browsers)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     text NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  pref_streak  boolean NOT NULL DEFAULT true,
  pref_errors  boolean NOT NULL DEFAULT true,
  pref_weekly  boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_read" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_insert" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_delete" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);
-- service_role bypasses RLS, so push-cron can read all rows without extra policy
