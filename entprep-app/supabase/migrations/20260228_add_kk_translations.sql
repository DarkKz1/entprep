-- Add Kazakh translation columns to questions table
-- Architecture: same-row columns (not separate rows with lang field)
-- Reason: ENT is only Russian + Kazakh, c (correct index) is shared, matching pair order must match

ALTER TABLE questions ADD COLUMN IF NOT EXISTS q_kk TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS o_kk TEXT[];
ALTER TABLE questions ADD COLUMN IF NOT EXISTS e_kk TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS pairs_kk JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS passage_title_kk TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS passage_text_kk TEXT;
