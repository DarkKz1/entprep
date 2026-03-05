-- Migration: Add question type columns for multi-type ENT format
-- Run this manually in Supabase SQL Editor

ALTER TABLE questions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'single'
  CHECK (type IN ('single', 'multiple', 'matching'));

ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_indices JSONB DEFAULT NULL;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS pairs JSONB DEFAULT NULL;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium'
  CHECK (difficulty IN ('easy', 'medium', 'hard'));

ALTER TABLE questions ADD COLUMN IF NOT EXISTS block TEXT DEFAULT NULL
  CHECK (block IN ('single', 'context', 'multiple', 'matching'));

CREATE INDEX IF NOT EXISTS idx_questions_type ON questions (subject, type);
CREATE INDEX IF NOT EXISTS idx_questions_block ON questions (subject, block);
