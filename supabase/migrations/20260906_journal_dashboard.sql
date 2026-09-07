/*
  # Dashboard v4 — Journal-first data layer

  1. Altered Tables
    - `session_debriefs`
      - `next_intent` (text, nullable) — carry-forward intent captured on the
        debrief rating screen, pre-fills the next pre-training check-in.
    - `program_scenario_completions`
      - `note_kind` (text, nullable) — classifies a per-scenario note as
        mechanics | mindset | positive. Null renders neutral.

  2. New Table
    - `vault_tips` — technique tips synced from the Obsidian vault by
      `scripts/sync-vault.mjs`, matched to a debrief's themes on the Home tab.

  3. Security
    - RLS on `vault_tips`; users may only read/write their own rows.

  4. Indexes
    - user_id for tip lookup; UNIQUE (user_id, source_path) is the sync upsert key.

  Note: `session_debriefs.scenario_notes` (jsonb) already exists in the live DB
  even though it is absent from `create_session_debriefs.sql`. Verified 2026-09-07.
*/

-- ─── Carry-forward intent captured at debrief time ───
ALTER TABLE session_debriefs ADD COLUMN IF NOT EXISTS next_intent text;

-- ─── Per-scenario note classification (mechanics | mindset | positive) ───
ALTER TABLE program_scenario_completions
  ADD COLUMN IF NOT EXISTS note_kind text
  CHECK (note_kind IN ('mechanics', 'mindset', 'positive'));

-- ─── Vault tips synced from Obsidian ───
CREATE TABLE IF NOT EXISTS vault_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_path text NOT NULL,           -- vault-relative path, e.g. "Aim Training/Techniques/Flick deceleration.md"
  title text NOT NULL,
  body text NOT NULL,                  -- 1–3 paragraphs, plain text/markdown
  drill text,                          -- optional one-liner
  themes text[] NOT NULL DEFAULT '{}', -- debrief theme ids this tip answers
  tags text[] NOT NULL DEFAULT '{}',   -- free tags (flicking, deceleration, ...)
  kind text CHECK (kind IN ('mechanics', 'mindset')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_path)
);

ALTER TABLE vault_tips ENABLE ROW LEVEL SECURITY;

-- Dropped first so the whole migration stays re-runnable, like the statements above.
DROP POLICY IF EXISTS "read own tips"   ON vault_tips;
DROP POLICY IF EXISTS "insert own tips" ON vault_tips;
DROP POLICY IF EXISTS "update own tips" ON vault_tips;
DROP POLICY IF EXISTS "delete own tips" ON vault_tips;

CREATE POLICY "read own tips"   ON vault_tips FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert own tips" ON vault_tips FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own tips" ON vault_tips FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "delete own tips" ON vault_tips FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_vault_tips_user ON vault_tips (user_id);
