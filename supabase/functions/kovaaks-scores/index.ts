// supabase/functions/kovaaks-scores/index.ts
//
// Syncs a training program's scores from the KovaaK's web API and works out
// which scenarios the player actually ran in the current session.
//
// Deploy as "kovaaks-scores" (Settings: Verify JWT = OFF) together with
// ./sessionPlays.ts, which holds the pure session logic (unit-tested from
// src/lib/sessionPlays.test.ts).
//
// Actions:
//   snapshot_program_baseline — called on Launch; stores each program scenario's
//                               current best so PRs can be detected on return.
//   sync_program_scores       — called on return (and on every window focus):
//                               refreshes scenarios / user_scenario_stats from the
//                               API, then returns the plays of this session and
//                               persists them to score_history, one row per run,
//                               keyed by the run's real timestamp (idempotent).
//
// What counts as a play is decided by collectSessionPlays(): a run from the
// local stats folder sent by the client (`localRuns`), a timestamped entry in
// /user/activity/recent, a best-score epoch inside the session window, or — as a
// last resort — a program scenario whose best moved since the baseline. The
// playlist's high-score snapshot on its own is NOT a play (that was the bug that
// made debriefs list every scenario of the opened playlist).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  collectSessionPlays,
  detectPrs,
  resolveSessionWindow,
  scenarioKey,
  DEFAULT_MAX_LOOKBACK_MS,
  DEFAULT_SESSION_GAP_MS,
  type BaselineChange,
  type LocalRun,
  type PersistedPlay,
  type PlaySource,
  type RecentActivityItem,
  type SessionPlay,
  type TotalPlayItem,
} from './sessionPlays.ts';

const KOVAAKS_BASE = 'https://kovaaks.com/webapp-backend';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Upper bound on client-supplied local runs per sync. */
const MAX_LOCAL_RUNS = 2000;
const PLAY_SOURCES: PlaySource[] = ['local_stats', 'kovaaks_recent', 'kovaaks_total_play', 'kovaaks_baseline'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Db = ReturnType<typeof createClient>;
// Loose shape for KovaaK's API payloads and request bodies.
// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function fetchJson(url: string, label: string): Promise<unknown | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.log(`${label} failed: ${resp.status}`);
      return null;
    }
    return await resp.json();
  } catch (e) {
    console.log(`${label} error: ${(e as Error).message}`);
    return null;
  }
}

/** Validate the `localRuns` payload sent by the client. Anything malformed is dropped. */
function parseLocalRuns(raw: unknown): LocalRun[] {
  if (!Array.isArray(raw)) return [];
  const runs: LocalRun[] = [];
  for (const item of raw.slice(0, MAX_LOCAL_RUNS)) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const scenarioName = typeof r.scenarioName === 'string' ? r.scenarioName.trim() : '';
    const score = typeof r.score === 'number' ? r.score : Number(r.score);
    const playedAt = typeof r.playedAt === 'string' ? r.playedAt : '';
    if (!scenarioName || !Number.isFinite(score) || Number.isNaN(Date.parse(playedAt))) continue;
    runs.push({
      scenarioName,
      score,
      playedAt: new Date(playedAt).toISOString(),
      hash: typeof r.hash === 'string' && r.hash ? r.hash : null,
      isChallenge: r.isChallenge !== false,
    });
  }
  return runs;
}

interface ScoreMapEntry {
  scenarioName: string;
  score: number;
  plays: number;
  aimType: string | null;
  leaderboardId: string | null;
  epoch: number | null;
}

interface MatchedScenario extends ScoreMapEntry {
  programName: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId: string | undefined = payload.sub;
    if (!userId) return json({ error: 'Invalid token' }, 401);

    const supabase: Db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const body = (await req.json()) as AnyRecord;
    const { action } = body;

    if (action === 'snapshot_program_baseline') {
      return await snapshotProgramBaseline(supabase, userId, body);
    }
    if (action === 'sync_program_scores') {
      return await syncProgramScores(supabase, userId, body);
    }
    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error('Edge function error:', err);
    return json({ error: String(err) }, 500);
  }
});

// ─── snapshot_program_baseline ───
// Captures the user's current high scores for a program's scenarios BEFORE
// they launch Kovaak's. Used on return to deterministically detect PRs.
async function snapshotProgramBaseline(supabase: Db, userId: string, body: AnyRecord): Promise<Response> {
  const scenarioNames = body.scenarioNames as unknown;
  const programId = (body.programId as string | null | undefined) || null;

  if (!Array.isArray(scenarioNames) || scenarioNames.length === 0) {
    return json({ error: 'scenarioNames array required' }, 400);
  }

  console.log(`Snapshotting baseline for ${scenarioNames.length} scenarios, user: ${userId}, program: ${programId}`);
  const sessionStartedAt = new Date().toISOString();

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('id, name')
    .in('name', scenarioNames);

  if (!scenarios || scenarios.length === 0) {
    // No scenarios in DB yet — write baseline rows with 0 so first-play still counts as PR
    const rows = scenarioNames.map((name: string) => ({
      user_id: userId,
      program_id: programId,
      session_started_at: sessionStartedAt,
      scenario_name: name,
      previous_high_score: 0,
    }));
    await supabase.from('session_baselines').insert(rows);
    return json({ success: true, sessionStartedAt, snapshotted: rows.length, source: 'no-scenarios' });
  }

  const scenarioIdByName = new Map<string, string>();
  for (const s of scenarios as { id: string; name: string }[]) scenarioIdByName.set(s.name, s.id);

  const { data: stats } = await supabase
    .from('user_scenario_stats')
    .select('scenario_id, high_score')
    .eq('user_id', userId)
    .in('scenario_id', Array.from(scenarioIdByName.values()));

  const highScoreByScenarioId = new Map<string, number>();
  for (const s of (stats || []) as { scenario_id: string; high_score: number | string | null }[]) {
    highScoreByScenarioId.set(s.scenario_id, Number(s.high_score) || 0);
  }

  const rows = scenarioNames.map((name: string) => {
    const scenarioId = scenarioIdByName.get(name);
    const previousHighScore = scenarioId ? (highScoreByScenarioId.get(scenarioId) || 0) : 0;
    return {
      user_id: userId,
      program_id: programId,
      session_started_at: sessionStartedAt,
      scenario_name: name,
      previous_high_score: previousHighScore,
    };
  });

  const { error: insertErr } = await supabase.from('session_baselines').insert(rows);
  if (insertErr) {
    console.error('Baseline insert error:', insertErr);
    return json({ error: insertErr.message }, 500);
  }

  console.log(`Baseline snapshotted: ${rows.length} rows at ${sessionStartedAt}`);
  return json({ success: true, sessionStartedAt, snapshotted: rows.length });
}

// ─── sync_program_scores ───
async function syncProgramScores(supabase: Db, userId: string, body: AnyRecord): Promise<Response> {
  const scenarioNames = body.scenarioNames as unknown;
  const programId = (body.programId as string | null | undefined) || null;
  const localRuns = parseLocalRuns(body.localRuns);

  if (!Array.isArray(scenarioNames) || scenarioNames.length === 0) {
    return json({ error: 'scenarioNames array required' }, 400);
  }
  const programNames = scenarioNames as string[];

  console.log(`Syncing scores for ${programNames.length} scenarios, user: ${userId}, program: ${programId}, local runs: ${localRuns.length}`);

  // Step 1: Kovaaks username
  const { data: profile } = await supabase
    .from('kovaaks_profiles')
    .select('username')
    .eq('user_id', userId)
    .single();

  if (!profile?.username) {
    return json({ error: 'No Kovaaks profile linked. Please sync your profile first.' }, 400);
  }
  const username: string = profile.username;
  console.log(`Username: ${username}`);

  // Step 2: Session window — earliest start signal (Launch baseline or pre-session
  // check-in) within the lookback, never reaching back past the last debrief.
  const now = new Date();
  let baselineQuery = supabase
    .from('session_baselines')
    .select('scenario_name, previous_high_score, session_started_at')
    .eq('user_id', userId);
  if (programId) baselineQuery = baselineQuery.eq('program_id', programId);

  const [baselineRes, checkinRes, debriefRes] = await Promise.all([
    baselineQuery.order('session_started_at', { ascending: false }).limit(500),
    supabase
      .from('mental_checkins')
      .select('created_at')
      .eq('user_id', userId)
      .eq('skipped', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('session_debriefs')
      .select('session_end')
      .eq('user_id', userId)
      .order('session_end', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const baselineRows = (baselineRes.data || []) as { scenario_name: string; previous_high_score: number | string; session_started_at: string }[];
  const latestBaselineAt = baselineRows[0]?.session_started_at ?? null;
  const baselineMap = new Map<string, number>();
  for (const row of baselineRows) {
    if (row.session_started_at !== latestBaselineAt) break;
    baselineMap.set(scenarioKey(row.scenario_name), Number(row.previous_high_score) || 0);
  }

  const window = resolveSessionWindow({
    now,
    baselineStartedAt: latestBaselineAt,
    checkinAt: checkinRes.data?.created_at ?? null,
    lastDebriefEndedAt: debriefRes.data?.session_end ?? null,
  });
  console.log(`Session window: ${window.start} → now (anchor: ${window.anchor}, not before: ${window.notBefore ?? 'none'})`);

  // Step 3: KovaaK's API sources
  const scoreMap = new Map<string, ScoreMapEntry>();
  const totalPlayItems: TotalPlayItem[] = [];
  const recentItems: RecentActivityItem[] = [];

  // Source 1: /user/scenario/total-play (paginated, all-time best per scenario)
  {
    let page = 0;
    let totalPages = 1;
    while (page < totalPages && page < 15) {
      const data = (await fetchJson(
        `${KOVAAKS_BASE}/user/scenario/total-play?username=${encodeURIComponent(username)}&page=${page}&max=50&sort=score`,
        `total-play page ${page}`,
      )) as { data?: unknown[]; total?: number; max?: number } | null;
      if (!data) break;
      const items = (data.data || []) as AnyRecord[];
      totalPages = Math.ceil((data.total || 0) / (data.max || 50));

      for (const item of items) {
        if (!item.scenarioName) continue;
        const key = scenarioKey(item.scenarioName);
        const score = Number(item.score) || 0;
        const epoch = typeof item.attributes?.epoch === 'number' ? item.attributes.epoch : null;
        const leaderboardId = item.leaderboardId ? String(item.leaderboardId) : null;
        const aimType = item.scenario?.aimType || null;

        totalPlayItems.push({ scenarioName: item.scenarioName, score, epoch, leaderboardId, aimType });

        const existing = scoreMap.get(key);
        if (!existing || score > existing.score) {
          scoreMap.set(key, {
            scenarioName: item.scenarioName,
            score,
            plays: item.counts?.plays || 0,
            aimType,
            leaderboardId,
            epoch,
          });
        }
      }
      page++;
    }
    console.log(`Source 1 (total-play): ${scoreMap.size} scenarios loaded`);
  }

  // Source 2: /user/activity/recent (last 10 new high scores, timestamped)
  {
    const recent = await fetchJson(
      `${KOVAAKS_BASE}/user/activity/recent?username=${encodeURIComponent(username)}`,
      'activity/recent',
    );
    if (Array.isArray(recent)) {
      for (const item of recent as AnyRecord[]) {
        if (!item.scenarioName) continue;
        const key = scenarioKey(item.scenarioName);
        const score = Number(item.score) || 0;
        const leaderboardId = item.leaderboardId ? String(item.leaderboardId) : null;
        if (typeof item.timestamp === 'string') {
          recentItems.push({ scenarioName: item.scenarioName, score, timestamp: item.timestamp, leaderboardId });
        }
        const existing = scoreMap.get(key);
        if (!existing || score > existing.score) {
          scoreMap.set(key, {
            scenarioName: item.scenarioName,
            score,
            plays: existing?.plays || 1,
            aimType: existing?.aimType || null,
            leaderboardId: leaderboardId || existing?.leaderboardId || null,
            epoch: existing?.epoch ?? null,
          });
        }
      }
      console.log(`Source 2 (activity/recent): ${recent.length} items, scoreMap now ${scoreMap.size} total`);
    }
  }

  // Source 3: /user/favorite/scenarios
  {
    const favorites = await fetchJson(
      `${KOVAAKS_BASE}/user/favorite/scenarios?username=${encodeURIComponent(username)}`,
      'favorites',
    );
    if (Array.isArray(favorites)) {
      for (const item of favorites as AnyRecord[]) {
        if (!item.scenarioName) continue;
        const key = scenarioKey(item.scenarioName);
        const score = Number(item.score) || 0;
        const existing = scoreMap.get(key);
        if (!existing || score > existing.score) {
          scoreMap.set(key, {
            scenarioName: item.scenarioName,
            score,
            plays: existing?.plays || 0,
            aimType: existing?.aimType || null,
            leaderboardId: item.leaderboardId ? String(item.leaderboardId) : (existing?.leaderboardId || null),
            epoch: existing?.epoch ?? null,
          });
        }
      }
      console.log(`Source 3 (favorites): ${favorites.length} items, scoreMap now ${scoreMap.size} total`);
    }
  }

  // Step 4: match program scenarios (exact, then with / without the S5 suffix)
  const matched: MatchedScenario[] = [];
  for (const name of programNames) {
    const key = scenarioKey(name);
    let found = scoreMap.get(key);
    if (!found) found = scoreMap.get(key + ' s5');
    if (!found && key.endsWith(' s5')) found = scoreMap.get(key.replace(/ s5$/, ''));
    if (found) matched.push({ programName: name, ...found });
  }
  console.log(`Matched ${matched.length}/${programNames.length} program scenarios`);

  // Step 5: refresh scenarios + user_scenario_stats for the program.
  // Captures each scenario's best BEFORE this sync for PR detection.
  const statsBefore = new Map<string, number>();
  const scenarioIdByKey = new Map<string, string>();
  const programKeys = new Set<string>();
  let synced = 0;
  let errors = 0;

  for (const item of matched) {
    const key = scenarioKey(item.programName);
    programKeys.add(key);
    try {
      const { data: existingScenario } = await supabase
        .from('scenarios')
        .select('id, category, kovaaks_id')
        .eq('name', item.programName)
        .maybeSingle();

      let scenarioId: string;
      if (existingScenario) {
        // Only fill gaps — never null out enriched benchmark data.
        await supabase
          .from('scenarios')
          .update({
            category: existingScenario.category || item.aimType,
            kovaaks_id: existingScenario.kovaaks_id || item.leaderboardId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingScenario.id);
        scenarioId = existingScenario.id;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('scenarios')
          .insert({
            name: item.programName,
            category: item.aimType,
            kovaaks_id: item.leaderboardId,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (insertError || !inserted) {
          console.log(`Scenario insert failed for ${item.programName}: ${insertError?.message}`);
          errors++;
          continue;
        }
        scenarioId = inserted.id;
      }
      scenarioIdByKey.set(key, scenarioId);

      const { data: existingStat } = await supabase
        .from('user_scenario_stats')
        .select('high_score, total_attempts')
        .eq('user_id', userId)
        .eq('scenario_id', scenarioId)
        .maybeSingle();

      const previousHigh = Number(existingStat?.high_score) || 0;
      statsBefore.set(key, previousHigh);

      // A high score never regresses because an API endpoint lags behind.
      const { error: statsErr } = await supabase
        .from('user_scenario_stats')
        .upsert(
          {
            user_id: userId,
            scenario_id: scenarioId,
            high_score: Math.max(item.score, previousHigh),
            total_attempts: Math.max(item.plays, existingStat?.total_attempts || 0),
            last_played_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,scenario_id' },
        );

      if (statsErr) {
        console.log(`Stats upsert failed for ${item.programName}: ${statsErr.message}`);
        errors++;
        continue;
      }
      synced++;
    } catch (e) {
      console.log(`Error processing ${item.programName}: ${(e as Error).message}`);
      errors++;
    }
  }

  // Step 6: plays of this session.
  // Baseline fallback only for program scenarios with no best-score epoch and a
  // known previous best (baseline snapshot, else stats before this sync).
  const baselineChanges: BaselineChange[] = [];
  for (const item of matched) {
    if (item.epoch !== null) continue;
    const key = scenarioKey(item.programName);
    const previous = baselineMap.get(key) ?? statsBefore.get(key);
    if (previous === undefined) continue;
    baselineChanges.push({
      scenarioName: item.programName,
      score: item.score,
      previousHighScore: previous,
      leaderboardId: item.leaderboardId,
      aimType: item.aimType,
    });
  }

  // Plays an earlier sync already persisted (idempotence; activity/recent only holds 10 items).
  const persisted: PersistedPlay[] = [];
  {
    const lookbackIso = new Date(now.getTime() - DEFAULT_MAX_LOOKBACK_MS).toISOString();
    const { data: rows, error } = await supabase
      .from('score_history')
      .select('score, session_date, source, play_key, scenarios!inner(name, kovaaks_id, category)')
      .eq('user_id', userId)
      .not('source', 'is', null)
      .gte('session_date', lookbackIso);
    if (error) {
      console.log(`score_history read failed (is migration 20261102_score_history_play_source applied?): ${error.message}`);
    } else {
      for (const row of (rows || []) as AnyRecord[]) {
        const scenario = Array.isArray(row.scenarios) ? row.scenarios[0] : row.scenarios;
        if (!scenario?.name || !PLAY_SOURCES.includes(row.source)) continue;
        persisted.push({
          scenarioName: scenario.name,
          score: Number(row.score) || 0,
          playedAt: row.session_date,
          source: row.source as PlaySource,
          leaderboardId: scenario.kovaaks_id ?? null,
          aimType: scenario.category ?? null,
          playKey: row.play_key ?? null,
        });
      }
    }
  }

  const plays = collectSessionPlays({
    window,
    now,
    gapMs: DEFAULT_SESSION_GAP_MS,
    recent: recentItems,
    totalPlay: totalPlayItems,
    baselineChanges,
    localRuns,
    persisted,
  });
  console.log(`Session plays: ${plays.length} (${plays.filter((p) => !p.stored).length} new, ${localRuns.length} local runs offered)`);

  // Step 7: persist new challenge plays, one row per run keyed by its real
  // timestamp. UNIQUE(user_id, scenario_id, session_date) makes re-syncs no-ops.
  let historyErrors = 0;
  for (const play of plays) {
    if (play.stored || !play.isChallenge) continue;
    const key = scenarioKey(play.scenarioName);
    try {
      const scenarioId = scenarioIdByKey.get(key) ?? (await resolveScenarioId(supabase, play));
      if (!scenarioId) {
        historyErrors++;
        continue;
      }
      scenarioIdByKey.set(key, scenarioId);

      // Non-program scenarios: remember the best before this session and keep stats current.
      if (!programKeys.has(key)) {
        const { data: stat } = await supabase
          .from('user_scenario_stats')
          .select('high_score, total_attempts, last_played_at')
          .eq('user_id', userId)
          .eq('scenario_id', scenarioId)
          .maybeSingle();
        const previousHigh = Number(stat?.high_score) || 0;
        if (!statsBefore.has(key)) statsBefore.set(key, previousHigh);
        const lastPlayed = stat?.last_played_at && stat.last_played_at > play.playedAt ? stat.last_played_at : play.playedAt;
        await supabase.from('user_scenario_stats').upsert(
          {
            user_id: userId,
            scenario_id: scenarioId,
            high_score: Math.max(play.score, previousHigh),
            total_attempts: (stat?.total_attempts || 0) + 1,
            last_played_at: lastPlayed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,scenario_id' },
        );
      }

      const { error: historyErr } = await supabase
        .from('score_history')
        .upsert(
          {
            user_id: userId,
            scenario_id: scenarioId,
            score: play.score,
            session_date: play.playedAt,
            score_type: 'play',
            source: play.source,
            play_key: play.playKey,
          },
          { onConflict: 'user_id,scenario_id,session_date' },
        );
      if (historyErr) {
        console.log(`History upsert failed for ${play.scenarioName}: ${historyErr.message}`);
        historyErrors++;
      }
    } catch (e) {
      console.log(`Error persisting play ${play.playKey}: ${(e as Error).message}`);
      historyErrors++;
    }
  }

  // Step 8: PRs — program scenarios against the Launch baseline, everything else
  // against the best known before this sync.
  const previousBest = new Map<string, number>(statsBefore);
  for (const [key, value] of baselineMap) previousBest.set(key, value);
  const prs = detectPrs(plays, previousBest);

  const notFound = programNames.filter((n) => !matched.some((m) => m.programName === n));
  console.log(`Sync complete: ${synced} synced, ${errors} errors, ${notFound.length} not found, ${plays.length} plays, ${prs.length} PRs, ${historyErrors} history errors`);

  return json({
    success: true,
    synced,
    errors,
    matched: matched.length,
    total: programNames.length,
    notFound,
    window,
    plays,
    prs,
    historyErrors,
    localRuns: localRuns.length,
  });
}

/** Find (or create) the scenarios row for a play: by KovaaK's id first, then by name. */
async function resolveScenarioId(supabase: Db, play: SessionPlay): Promise<string | null> {
  if (play.leaderboardId) {
    const { data } = await supabase.from('scenarios').select('id').eq('kovaaks_id', play.leaderboardId).maybeSingle();
    if (data?.id) return data.id;
  }
  const { data: byName } = await supabase.from('scenarios').select('id').eq('name', play.scenarioName).maybeSingle();
  if (byName?.id) return byName.id;
  const { data: byIlike } = await supabase.from('scenarios').select('id').ilike('name', play.scenarioName).limit(1).maybeSingle();
  if (byIlike?.id) return byIlike.id;

  const { data: inserted, error } = await supabase
    .from('scenarios')
    .insert({
      name: play.scenarioName,
      category: play.aimType,
      kovaaks_id: play.leaderboardId,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (error) {
    console.log(`Scenario insert failed for ${play.scenarioName}: ${error.message}`);
    const { data: retry } = await supabase.from('scenarios').select('id').eq('name', play.scenarioName).maybeSingle();
    return retry?.id ?? null;
  }
  return inserted?.id ?? null;
}
