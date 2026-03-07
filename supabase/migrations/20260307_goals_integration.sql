-- Goals Integration Migration
-- Adds missing columns to goals table and creates goal_progress_entries

-- Extend goals table with new columns
ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'process'
  CHECK (goal_type IN ('process', 'outcome', 'habit'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS category TEXT
  CHECK (category IN ('tracking', 'clicking', 'switching', 'mental', 'consistency', 'custom'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_value NUMERIC;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'completed', 'paused', 'abandoned'));
ALTER TABLE goals ADD COLUMN IF NOT EXISTS priority SMALLINT DEFAULT 1
  CHECK (priority BETWEEN 1 AND 3);
ALTER TABLE goals ADD COLUMN IF NOT EXISTS linked_scenarios JSONB DEFAULT '[]';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS created_from TEXT;

-- Index for active goals (most common query)
CREATE INDEX IF NOT EXISTS idx_goals_user_active
  ON goals(user_id, status) WHERE status = 'active';

-- Goal progress entries table
CREATE TABLE IF NOT EXISTS goal_progress_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  value_snapshot NUMERIC NOT NULL,
  delta NUMERIC,
  source TEXT NOT NULL CHECK (source IN ('auto_sync', 'manual', 'debrief')),
  session_debrief_id UUID REFERENCES session_debriefs(id),
  note TEXT
);

ALTER TABLE goal_progress_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON goal_progress_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON goal_progress_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_date
  ON goal_progress_entries(goal_id, created_at DESC);
