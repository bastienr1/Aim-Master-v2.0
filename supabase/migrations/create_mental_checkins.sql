/*
  # Create Mental Check-in Tables

  1. New Tables
    - `mental_checkins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `energy_level` (smallint, 1-5, nullable for skipped)
      - `focus_level` (smallint, 1-5, nullable for skipped)
      - `mood_level` (smallint, 1-5, nullable — mood is optional)
      - `session_intent` (text, nullable for skipped)
      - `skipped` (boolean, default false)
      - `coaching_tip_shown` (text, nullable)
      - `created_at` (timestamptz)

    - `coaching_insights`
      - `id` (uuid, primary key)
      - `tier` (smallint, 1-3)
      - `trigger_condition` (jsonb — e.g. {"energy_min":1,"energy_max":2,"focus_min":1,"focus_max":5})
      - `message` (text)
      - `priority` (smallint, higher = more important)
      - `category` (text — energy, focus, mood, intent, general)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only read/write their own mental_checkins
    - coaching_insights readable by all authenticated users (admin-seeded)

  3. Indexes
    - mental_checkins: user_id + created_at for fast history queries
    - coaching_insights: tier + priority for fast lookup
*/

-- Mental check-ins table
CREATE TABLE IF NOT EXISTS mental_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  energy_level smallint CHECK (energy_level BETWEEN 1 AND 5),
  focus_level smallint CHECK (focus_level BETWEEN 1 AND 5),
  mood_level smallint CHECK (mood_level BETWEEN 1 AND 5),
  session_intent text CHECK (session_intent IN ('warmup', 'improve', 'push_pr', 'maintenance')),
  skipped boolean NOT NULL DEFAULT false,
  coaching_tip_shown text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mental_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own checkins"
  ON mental_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own checkins"
  ON mental_checkins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mental_checkins_user_created
  ON mental_checkins (user_id, created_at DESC);

-- Coaching insights table (admin-seeded reference data)
CREATE TABLE IF NOT EXISTS coaching_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier smallint NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 3),
  trigger_condition jsonb NOT NULL DEFAULT '{}',
  message text NOT NULL,
  priority smallint NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coaching_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read coaching insights"
  ON coaching_insights
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_coaching_insights_tier_priority
  ON coaching_insights (tier, priority DESC);

-- Seed tier 1 coaching insights
INSERT INTO coaching_insights (tier, trigger_condition, message, priority, category) VALUES
  (1, '{"energy_min":1,"energy_max":2}', 'Low energy detected. Consider a shorter, focused session today. Quality reps beat quantity when you''re drained.', 10, 'energy'),
  (1, '{"energy_min":4,"energy_max":5}', 'High energy is great — channel it into precision, not speed. Stay controlled and let the scores come naturally.', 8, 'energy'),
  (1, '{"focus_min":1,"focus_max":2}', 'Focus is low today. Start with easy tracking scenarios to build concentration before jumping into benchmarks.', 10, 'focus'),
  (1, '{"focus_min":4,"focus_max":5}', 'You''re locked in. This is a great time to push difficult scenarios and work on your weakest areas.', 8, 'focus'),
  (1, '{"mood_min":1,"mood_max":2}', 'Feeling tilted? Avoid ranked or PR attempts. Use this session for mechanical practice — no pressure, just reps.', 10, 'mood'),
  (1, '{"energy_min":1,"energy_max":2,"focus_min":1,"focus_max":2}', 'Both energy and focus are low. Keep it light — 15 minutes of easy scenarios is better than forcing a bad session.', 15, 'general'),
  (1, '{"energy_min":4,"energy_max":5,"focus_min":4,"focus_max":5}', 'Peak readiness detected. This is your window — push hard, attempt PRs, and trust your preparation.', 15, 'general'),
  (1, '{"intent":"push_pr","energy_min":1,"energy_max":2}', 'You want to push PRs but energy is low. Consider warming up first and reassessing — PRs need fuel.', 12, 'intent'),
  (1, '{"intent":"push_pr","focus_min":4,"focus_max":5}', 'Locked in and ready to push PRs. Perfect mindset. Commit to each attempt fully — no half-reps.', 12, 'intent'),
  (1, '{"intent":"warmup"}', 'Warming up is smart. Start with large targets and slow tracking, then gradually increase difficulty.', 5, 'intent'),
  (1, '{"intent":"improve"}', 'Improvement sessions work best with deliberate practice. Pick 2-3 weak scenarios and grind them intentionally.', 5, 'intent'),
  (1, '{"intent":"maintenance"}', 'Maintenance mode — keep it consistent. Run your usual routine and focus on clean mechanics.', 5, 'intent');
