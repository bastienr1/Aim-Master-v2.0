-- Fix: Drop and recreate CHECK constraints on goals table
-- The original migration used ADD COLUMN IF NOT EXISTS which skips
-- constraint creation if the column already existed.

-- Drop existing CHECK constraints on goal_type (find and drop by column)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
    WHERE con.conrelid = 'goals'::regclass
      AND con.contype = 'c'
      AND att.attname IN ('goal_type', 'category', 'status', 'priority')
  ) LOOP
    EXECUTE 'ALTER TABLE goals DROP CONSTRAINT ' || r.conname;
  END LOOP;
END $$;

-- Recreate CHECK constraints
ALTER TABLE goals ADD CONSTRAINT goals_goal_type_check
  CHECK (goal_type IN ('process', 'outcome', 'habit'));

ALTER TABLE goals ADD CONSTRAINT goals_category_check
  CHECK (category IN ('tracking', 'clicking', 'switching', 'mental', 'consistency', 'custom'));

ALTER TABLE goals ADD CONSTRAINT goals_status_check
  CHECK (status IN ('active', 'completed', 'paused', 'abandoned'));

ALTER TABLE goals ADD CONSTRAINT goals_priority_check
  CHECK (priority BETWEEN 1 AND 3);

-- Ensure RLS policies exist for goals table
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can view own goals'
  ) THEN
    CREATE POLICY "Users can view own goals" ON goals
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can insert own goals'
  ) THEN
    CREATE POLICY "Users can insert own goals" ON goals
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can update own goals'
  ) THEN
    CREATE POLICY "Users can update own goals" ON goals
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'goals' AND policyname = 'Users can delete own goals'
  ) THEN
    CREATE POLICY "Users can delete own goals" ON goals
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
