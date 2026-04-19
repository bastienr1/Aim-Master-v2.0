-- Pre-session baseline snapshot for deterministic PR detection.
-- Captured on Steam launch; compared against scores on return.
CREATE TABLE IF NOT EXISTS public.session_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id uuid REFERENCES public.training_programs(id) ON DELETE SET NULL,
  session_started_at timestamptz NOT NULL DEFAULT now(),
  scenario_name text NOT NULL,
  previous_high_score numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lookup index: fetch baselines for the most recent launch per user+program
CREATE INDEX IF NOT EXISTS idx_session_baselines_user_program_started
  ON public.session_baselines (user_id, program_id, session_started_at DESC);

-- Cleanup index: delete baselines older than 24 hours
CREATE INDEX IF NOT EXISTS idx_session_baselines_created
  ON public.session_baselines (created_at);

-- RLS
ALTER TABLE public.session_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own baselines"
  ON public.session_baselines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage baselines"
  ON public.session_baselines FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Nightly cleanup: baselines older than 24h are stale
CREATE OR REPLACE FUNCTION public.cleanup_stale_session_baselines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.session_baselines
  WHERE created_at < now() - interval '24 hours';
END;
$$;
