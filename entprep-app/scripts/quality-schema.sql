-- ENTprep Quality Control Schema
-- Run in Supabase SQL Editor (Dashboard → SQL)

-- 1. New table: question_reports
CREATE TABLE question_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  idx INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('wrong_answer','bad_question','bad_explanation','other')),
  comment TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One report per question per user
CREATE UNIQUE INDEX question_reports_unique ON question_reports (question_id, user_id);
-- Fast lookups by subject
CREATE INDEX question_reports_subject_idx ON question_reports (subject);

-- 2. Add report_count to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0;

-- 3. Auto-increment trigger
CREATE OR REPLACE FUNCTION increment_report_count() RETURNS TRIGGER AS $$
BEGIN
  UPDATE questions SET report_count = report_count + 1 WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_report_insert AFTER INSERT ON question_reports
FOR EACH ROW EXECUTE FUNCTION increment_report_count();

-- 4. RLS for question_reports
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "insert_own" ON question_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all reports
CREATE POLICY "admin_read" ON question_reports FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' IN ('dzakpelov@gmail.com','monabekova2@gmail.com'));

-- Admins can delete reports (dismiss)
CREATE POLICY "admin_delete" ON question_reports FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'email' IN ('dzakpelov@gmail.com','monabekova2@gmail.com'));

-- 5. Admin policies on questions table (update + delete)
-- Note: if these policies already exist, the CREATE will error — safe to ignore
CREATE POLICY "admin_update_q" ON questions FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'email' IN ('dzakpelov@gmail.com','monabekova2@gmail.com'));

CREATE POLICY "admin_delete_q" ON questions FOR DELETE TO authenticated
  USING (auth.jwt() ->> 'email' IN ('dzakpelov@gmail.com','monabekova2@gmail.com'));
