-- Tag score_history rows that come from real play evidence.
--
-- Before this change the kovaaks-scores sync wrote one score_history row per
-- program scenario with session_date = sync time, on every sync, so the
-- post-session debrief listed the whole opened playlist and re-syncs
-- duplicated the rows. Rows written by the fixed sync carry the evidence
-- source and a deterministic play key; session detection only trusts those.
--
-- The existing UNIQUE (user_id, scenario_id, session_date) stays the upsert
-- target: with session_date now being the real run time, it makes a re-sync
-- idempotent per play.

ALTER TABLE public.score_history
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS play_key text;

COMMENT ON COLUMN public.score_history.source IS
  'Evidence the row came from: local_stats (KovaaK''s stats CSV), kovaaks_recent (activity/recent), kovaaks_total_play (best-score epoch), kovaaks_baseline (best moved since launch, no timestamp). NULL = legacy sync snapshot.';
COMMENT ON COLUMN public.score_history.play_key IS
  'Deterministic play id "<source>:<scenario>:<second>"; identical across re-syncs.';

CREATE INDEX IF NOT EXISTS idx_score_history_user_play_key
  ON public.score_history (user_id, play_key)
  WHERE play_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_score_history_user_session_source
  ON public.score_history (user_id, session_date DESC)
  WHERE source IS NOT NULL;
