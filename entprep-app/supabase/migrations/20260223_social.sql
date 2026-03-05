-- Stage 6: Social features — profiles + friendships
-- Run this migration in Supabase SQL editor

-- ── Profiles table ────────────────────────────────────────────────────────────
-- Public-facing user data that other users can query.
-- auth.users is not queryable by anon key (RLS), so we need this.

CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname     text UNIQUE NOT NULL,
  display_name text,
  avatar_url   text,
  level        smallint NOT NULL DEFAULT 1,
  xp           int NOT NULL DEFAULT 0,
  streak       smallint NOT NULL DEFAULT 0,
  last_active  timestamptz DEFAULT now(),
  created_at   timestamptz DEFAULT now()
);

-- Unique index for case-insensitive nickname lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(lower(nickname));

-- RLS: everyone can read, only owner can update/insert
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, nickname)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    'user_' || substr(NEW.id::text, 1, 8)
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO profiles (id, display_name, avatar_url, nickname)
SELECT id,
       raw_user_meta_data->>'full_name',
       raw_user_meta_data->>'avatar_url',
       'user_' || substr(id::text, 1, 8)
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ── Friendships table ─────────────────────────────────────────────────────────
-- Bidirectional: one row per request. Status: pending → accepted/declined.
-- To find friends of user X: WHERE (user_id=X OR friend_id=X) AND status='accepted'

CREATE TABLE IF NOT EXISTS friendships (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id, status);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Read: only if you're one of the two parties
CREATE POLICY "fs_read" ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Insert: only the requester
CREATE POLICY "fs_insert" ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Update: only the recipient can accept/decline
CREATE POLICY "fs_update" ON friendships FOR UPDATE
  USING (auth.uid() = friend_id);

-- Delete: either party can remove
CREATE POLICY "fs_delete" ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);
