-- Add subtopic column to questions table (Phase 1.2 of subtopic expansion)
-- Keeps existing `topic` column (section-level), adds `subtopic` for fine-grained classification

ALTER TABLE questions ADD COLUMN IF NOT EXISTS subtopic TEXT;

-- Composite index for efficient filtering by subject + subtopic
CREATE INDEX IF NOT EXISTS idx_questions_subtopic ON questions (subject, subtopic);
