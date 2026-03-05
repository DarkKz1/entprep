-- Real-time 1v1 duels table
CREATE TABLE duels (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code            text UNIQUE NOT NULL,
  subject         text NOT NULL,
  creator_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  opponent_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  question_ids    int[] NOT NULL,
  status          text NOT NULL DEFAULT 'waiting'
                  CHECK (status IN ('waiting','active','finished','expired','forfeit')),
  creator_score   smallint NOT NULL DEFAULT 0,
  opponent_score  smallint NOT NULL DEFAULT 0,
  creator_done    boolean NOT NULL DEFAULT false,
  opponent_done   boolean NOT NULL DEFAULT false,
  creator_answers jsonb NOT NULL DEFAULT '{}',
  opponent_answers jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  started_at      timestamptz,
  finished_at     timestamptz,
  expires_at      timestamptz NOT NULL
);

CREATE INDEX idx_duels_code ON duels(code) WHERE status = 'waiting';
CREATE INDEX idx_duels_players ON duels(creator_id);

-- RLS: clients can only SELECT their own duels (for Realtime subscription)
-- All writes go through Netlify functions using service key (bypasses RLS)
ALTER TABLE duels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "duels_select" ON duels FOR SELECT
  USING (creator_id = auth.uid() OR opponent_id = auth.uid());

-- Enable Realtime for live duel updates
ALTER PUBLICATION supabase_realtime ADD TABLE duels;
