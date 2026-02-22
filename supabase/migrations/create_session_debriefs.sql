/*
  # Create Session Debriefs Table

  1. New Table
    - `session_debriefs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `session_start` (timestamptz)
      - `session_end` (timestamptz)
      - `duration_seconds` (integer)
      - `scenario_count` (integer)
      - `categories` (jsonb — e.g. {"clicking":3,"tracking":2})
      - `prs_detected` (jsonb — array of PR objects)
      - `score_trajectory` (jsonb — normalized 0-1 array)
      - `scores_declined` (boolean)
      - `primary_theme` (text, nullable)
      - `secondary_theme` (text, nullable)
      - `freeform_text` (text, nullable)
      - `emoji_reaction` (text, nullable)
      - `session_quality` (smallint, nullable)
      - `checkin_id` (uuid, nullable — link to mental_checkins)
      - `kovaaks_play_ids` (text[], nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can only read/write their own debriefs

  3. Indexes
    - user_id + created_at for fast rolling-window queries (PR Streak Tracker)
*/

CREATE TABLE IF NOT EXISTS session_debriefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_start timestamptz NOT NULL,
  session_end timestamptz NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  scenario_count integer NOT NULL DEFAULT 0,
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  prs_detected jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_trajectory jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores_declined boolean NOT NULL DEFAULT false,
  primary_theme text,
  secondary_theme text,
  freeform_text text,
  emoji_reaction text,
  session_quality smallint CHECK (session_quality BETWEEN 1 AND 5),
  checkin_id uuid REFERENCES mental_checkins(id) ON DELETE SET NULL,
  kovaaks_play_ids text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE session_debriefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own debriefs"
  ON session_debriefs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own debriefs"
  ON session_debriefs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_session_debriefs_user_created
  ON session_debriefs (user_id, created_at DESC);
