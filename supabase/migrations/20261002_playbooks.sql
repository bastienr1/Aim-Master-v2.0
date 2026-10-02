/*
  # Playbooks — chaptered, video-anchored technique notes from the Obsidian vault

  1. New Tables
    - `playbooks`          — one row per vault note that carries timed chapters.
    - `playbook_chapters`  — `###` headings with a `[start–end]` range.
    - `playbook_moments`   — `####` situations inside a chapter (↳ rows).
    - `playbook_drills`    — rows of the note's `## Practice Extraction` table.

  2. Function
    - `sync_playbook(...)` — atomic create / update / no-op for one parsed note.
      Called by `scripts/sync-playbooks.ts` with the service-role key.

  3. Security
    - RLS on all four tables. Signed-in users may only READ their own rows.
      There are no write policies: every write goes through the sync script
      (service role), so the vault stays the single source of truth.

  4. Identity
    - A playbook is keyed by (user_id, source_path) — the same key `vault_tips`
      uses, so a note that is both a tip and a playbook joins on `source_path`.
    - Chapters are matched by chapter_number and drills by position, updated in
      place so their ids survive a re-sync. Moments are derived and replaced.

  Re-runnable: every statement is IF NOT EXISTS / OR REPLACE / DROP-then-CREATE.
*/

-- ─── Tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_path text NOT NULL,              -- vault-relative, e.g. "Aim Techniques/Clicking/2026-09-19-….md"
  title text NOT NULL,
  slug text NOT NULL,
  video_url text,
  video_duration_seconds int,
  description text,                       -- the note's Essence callout
  content_type text,                      -- frontmatter `content-type` (mechanics | mindset | …)
  creator text,
  difficulty text,
  kind text CHECK (kind IN ('mechanics', 'mindset')),
  themes text[] NOT NULL DEFAULT '{}',    -- debrief theme ids, same vocabulary as vault_tips.themes
  tags text[] NOT NULL DEFAULT '{}',
  content_hash text,                      -- sha256 of parser version + note text
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_path)
);

CREATE TABLE IF NOT EXISTS playbook_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  chapter_number int NOT NULL,
  title text NOT NULL,
  start_seconds int NOT NULL,
  end_seconds int NOT NULL,
  depth smallint NOT NULL DEFAULT 1 CHECK (depth IN (1, 2)),
  parent_chapter_number int,
  notes_markdown text,
  key_takeaways text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playbook_id, chapter_number),
  CHECK (end_seconds > start_seconds)
);

CREATE TABLE IF NOT EXISTS playbook_moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  chapter_number int NOT NULL,
  position int NOT NULL,                  -- order inside the chapter, 1-based
  label text NOT NULL,
  start_seconds int NOT NULL,
  end_seconds int NOT NULL,
  UNIQUE (playbook_id, chapter_number, position)
);

CREATE TABLE IF NOT EXISTS playbook_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  position int NOT NULL,                  -- row order in the note; a drill's identity
  title text NOT NULL,
  venue text,                             -- the `Where` cell as written
  scenario text,                          -- exact KovaaK's scenario name, when the note gives one
  cue text,
  success_signal text,
  source_start_seconds int,
  source_end_seconds int,
  target_count int,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playbook_id, position)
);

CREATE INDEX IF NOT EXISTS idx_playbooks_user ON playbooks (user_id);
CREATE INDEX IF NOT EXISTS idx_playbook_drills_scenario ON playbook_drills (scenario) WHERE scenario IS NOT NULL;

-- ─── RLS — read your own, write nothing ───────────────────────────────────

ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_drills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own playbooks" ON playbooks;
CREATE POLICY "read own playbooks" ON playbooks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "read own playbook chapters" ON playbook_chapters;
CREATE POLICY "read own playbook chapters" ON playbook_chapters
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM playbooks p WHERE p.id = playbook_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "read own playbook moments" ON playbook_moments;
CREATE POLICY "read own playbook moments" ON playbook_moments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM playbooks p WHERE p.id = playbook_id AND p.user_id = auth.uid()));

DROP POLICY IF EXISTS "read own playbook drills" ON playbook_drills;
CREATE POLICY "read own playbook drills" ON playbook_drills
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM playbooks p WHERE p.id = playbook_id AND p.user_id = auth.uid()));

-- ─── sync_playbook — atomic create / update / no-op for one parsed note ────
--
-- p_playbook: { title, slug, video_url, video_duration_seconds, description,
--               content_type, creator, difficulty, kind, themes[], tags[] }
-- p_chapters: [{ chapter_number, title, start_seconds, end_seconds, depth,
--                parent_chapter_number, notes_markdown, key_takeaways[] }]
-- p_moments:  [{ chapter_number, position, label, start_seconds, end_seconds }]
-- p_drills:   [{ position, title, venue, scenario, cue, success_signal,
--                source_start_seconds, source_end_seconds, target_count }]

CREATE OR REPLACE FUNCTION sync_playbook(
  p_user_id uuid,
  p_source_path text,
  p_content_hash text,
  p_playbook jsonb,
  p_chapters jsonb,
  p_moments jsonb,
  p_drills jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_existing playbooks%ROWTYPE;
  v_playbook_id uuid;
  v_action text;
BEGIN
  IF jsonb_typeof(p_chapters) IS DISTINCT FROM 'array' OR jsonb_array_length(p_chapters) = 0 THEN
    RAISE EXCEPTION 'A playbook needs at least one chapter';
  END IF;

  SELECT * INTO v_existing
    FROM playbooks
   WHERE user_id = p_user_id AND source_path = p_source_path
   FOR UPDATE;

  IF FOUND AND v_existing.content_hash = p_content_hash THEN
    RETURN jsonb_build_object('playbook_id', v_existing.id, 'action', 'unchanged');
  END IF;

  IF FOUND THEN
    v_playbook_id := v_existing.id;
    v_action := 'updated';
    UPDATE playbooks SET
      title = p_playbook->>'title',
      slug = p_playbook->>'slug',
      video_url = p_playbook->>'video_url',
      video_duration_seconds = (p_playbook->>'video_duration_seconds')::int,
      description = p_playbook->>'description',
      content_type = p_playbook->>'content_type',
      creator = p_playbook->>'creator',
      difficulty = p_playbook->>'difficulty',
      kind = p_playbook->>'kind',
      themes = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_playbook->'themes', '[]'::jsonb))),
      tags = ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_playbook->'tags', '[]'::jsonb))),
      content_hash = p_content_hash,
      updated_at = now()
    WHERE id = v_playbook_id;
  ELSE
    v_action := 'created';
    INSERT INTO playbooks (
      user_id, source_path, title, slug, video_url, video_duration_seconds, description,
      content_type, creator, difficulty, kind, themes, tags, content_hash
    ) VALUES (
      p_user_id,
      p_source_path,
      p_playbook->>'title',
      p_playbook->>'slug',
      p_playbook->>'video_url',
      (p_playbook->>'video_duration_seconds')::int,
      p_playbook->>'description',
      p_playbook->>'content_type',
      p_playbook->>'creator',
      p_playbook->>'difficulty',
      p_playbook->>'kind',
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_playbook->'themes', '[]'::jsonb))),
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_playbook->'tags', '[]'::jsonb))),
      p_content_hash
    )
    RETURNING id INTO v_playbook_id;
  END IF;

  -- Chapters: drop the ones that left the note, upsert the rest by number.
  DELETE FROM playbook_chapters
   WHERE playbook_id = v_playbook_id
     AND chapter_number NOT IN (SELECT (c->>'chapter_number')::int FROM jsonb_array_elements(p_chapters) c);

  INSERT INTO playbook_chapters (
    playbook_id, chapter_number, title, start_seconds, end_seconds, depth,
    parent_chapter_number, notes_markdown, key_takeaways
  )
  SELECT
    v_playbook_id,
    (c->>'chapter_number')::int,
    c->>'title',
    (c->>'start_seconds')::int,
    (c->>'end_seconds')::int,
    COALESCE((c->>'depth')::smallint, 1),
    (c->>'parent_chapter_number')::int,
    c->>'notes_markdown',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(c->'key_takeaways', '[]'::jsonb)))
  FROM jsonb_array_elements(p_chapters) c
  ON CONFLICT (playbook_id, chapter_number) DO UPDATE SET
    title = EXCLUDED.title,
    start_seconds = EXCLUDED.start_seconds,
    end_seconds = EXCLUDED.end_seconds,
    depth = EXCLUDED.depth,
    parent_chapter_number = EXCLUDED.parent_chapter_number,
    notes_markdown = EXCLUDED.notes_markdown,
    key_takeaways = EXCLUDED.key_takeaways,
    updated_at = now();

  -- Moments are derived from the chapter bodies: replace them wholesale.
  DELETE FROM playbook_moments WHERE playbook_id = v_playbook_id;

  INSERT INTO playbook_moments (playbook_id, chapter_number, position, label, start_seconds, end_seconds)
  SELECT
    v_playbook_id,
    (m->>'chapter_number')::int,
    (m->>'position')::int,
    m->>'label',
    (m->>'start_seconds')::int,
    (m->>'end_seconds')::int
  FROM jsonb_array_elements(COALESCE(p_moments, '[]'::jsonb)) m;

  -- Drills: position is identity, so update in place and keep the ids.
  DELETE FROM playbook_drills
   WHERE playbook_id = v_playbook_id
     AND position NOT IN (SELECT (d->>'position')::int FROM jsonb_array_elements(COALESCE(p_drills, '[]'::jsonb)) d);

  INSERT INTO playbook_drills (
    playbook_id, position, title, venue, scenario, cue, success_signal,
    source_start_seconds, source_end_seconds, target_count
  )
  SELECT
    v_playbook_id,
    (d->>'position')::int,
    d->>'title',
    d->>'venue',
    d->>'scenario',
    d->>'cue',
    d->>'success_signal',
    (d->>'source_start_seconds')::int,
    (d->>'source_end_seconds')::int,
    (d->>'target_count')::int
  FROM jsonb_array_elements(COALESCE(p_drills, '[]'::jsonb)) d
  ON CONFLICT (playbook_id, position) DO UPDATE SET
    title = EXCLUDED.title,
    venue = EXCLUDED.venue,
    scenario = EXCLUDED.scenario,
    cue = EXCLUDED.cue,
    success_signal = EXCLUDED.success_signal,
    source_start_seconds = EXCLUDED.source_start_seconds,
    source_end_seconds = EXCLUDED.source_end_seconds,
    target_count = EXCLUDED.target_count,
    updated_at = now();

  RETURN jsonb_build_object('playbook_id', v_playbook_id, 'action', v_action);
END;
$$;

-- Only the sync script (service role) may call it. A signed-in user could not
-- write through it anyway — there are no write policies — but there is no
-- reason to expose it.
REVOKE ALL ON FUNCTION sync_playbook(uuid, text, text, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION sync_playbook(uuid, text, text, jsonb, jsonb, jsonb, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION sync_playbook(uuid, text, text, jsonb, jsonb, jsonb, jsonb) TO service_role;
