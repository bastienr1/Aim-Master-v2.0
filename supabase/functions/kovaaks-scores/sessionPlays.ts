// supabase/functions/kovaaks-scores/sessionPlays.ts
//
// Pure helpers that decide which plays belong to a training session.
// Shared by the kovaaks-scores edge function (Deno) and the app (vite) and its
// unit tests (node:test, see src/lib/sessionPlays.test.ts). No runtime imports.
//
// A "play" is one completed run of one scenario. Evidence comes from four
// places, in order of trust:
//   1. local_stats        — a `<Scenario> - Challenge - <stamp> Stats.csv` file
//                           from the KovaaK's stats folder (exact score + time).
//   2. kovaaks_recent     — /user/activity/recent: the player's last 10 new high
//                           scores, each with a timestamp.
//   3. kovaaks_total_play — /user/scenario/total-play: all-time best per
//                           scenario, with the epoch the best was set.
//   4. kovaaks_baseline   — no timestamped evidence at all, but the all-time best
//                           moved since the pre-launch baseline snapshot.
// Everything that is NOT one of those (for example the high-score snapshot of a
// playlist the player merely opened) is not a play and never reaches the debrief.

export type PlaySource =
  | 'local_stats'
  | 'kovaaks_recent'
  | 'kovaaks_total_play'
  | 'kovaaks_baseline';

export interface SessionPlay {
  scenarioName: string;
  score: number;
  /** ISO timestamp of the run (end of run for local files). */
  playedAt: string;
  source: PlaySource;
  /** false = freeplay / aborted run from a local file; shown in the debrief, never persisted or used for PRs. */
  isChallenge: boolean;
  leaderboardId: string | null;
  aimType: string | null;
  hash: string | null;
  /** Deterministic id for this play: `<source>:<scenario>:<second>`. Re-syncs produce the same key. */
  playKey: string;
  /** true when this play was read back from score_history (already persisted by an earlier sync). */
  stored: boolean;
}

export interface RecentActivityItem {
  scenarioName: string;
  score: number;
  timestamp: string;
  leaderboardId?: string | number | null;
}

export interface TotalPlayItem {
  scenarioName: string;
  score: number;
  /** ms epoch at which the best score was set (attributes.epoch). */
  epoch?: number | null;
  leaderboardId?: string | number | null;
  aimType?: string | null;
}

export interface BaselineChange {
  scenarioName: string;
  /** Current all-time best reported by the API. */
  score: number;
  /** Best before the session (session_baselines / user_scenario_stats). */
  previousHighScore: number;
  leaderboardId?: string | number | null;
  aimType?: string | null;
}

export interface LocalRun {
  scenarioName: string;
  score: number;
  playedAt: string;
  hash?: string | null;
  isChallenge: boolean;
}

export interface PersistedPlay {
  scenarioName: string;
  score: number;
  playedAt: string;
  source: PlaySource;
  leaderboardId?: string | null;
  aimType?: string | null;
  playKey?: string | null;
}

export interface SessionWindowInput {
  now: string | number | Date;
  /** session_baselines.session_started_at of the latest launch (set when the player clicks Launch). */
  baselineStartedAt?: string | null;
  /** mental_checkins.created_at of the latest non-skipped pre-session check-in. */
  checkinAt?: string | null;
  /** session_end of the latest saved debrief: plays at or before it were already debriefed. */
  lastDebriefEndedAt?: string | null;
  /** Ignore anchors older than this. Default 12 h. */
  maxLookbackMs?: number;
  /** Window length when no anchor exists. Default 1 h. */
  fallbackMs?: number;
}

export type SessionAnchor = 'baseline' | 'checkin' | 'fallback';

export interface SessionWindow {
  /** ISO. Plays at or after this instant belong to the session. */
  start: string;
  /** ISO or null. Plays at or before this instant never belong to the session. */
  notBefore: string | null;
  anchor: SessionAnchor;
}

export const DEFAULT_MAX_LOOKBACK_MS = 12 * 60 * 60 * 1000;
export const DEFAULT_FALLBACK_MS = 60 * 60 * 1000;
/** Two runs closer than this belong to the same session (mirrors SESSION_GAP_THRESHOLD_MS in the app). */
export const DEFAULT_SESSION_GAP_MS = 10 * 60 * 1000;
/** The same run seen from two sources can differ by a second or two. */
export const SAME_PLAY_TOLERANCE_MS = 5000;

const SOURCE_PRIORITY: Record<PlaySource, number> = {
  local_stats: 3,
  kovaaks_recent: 2,
  kovaaks_total_play: 1,
  kovaaks_baseline: 0,
};

function toMs(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const ms = value instanceof Date ? value.getTime() : typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function isoSeconds(ms: number): string {
  return new Date(Math.floor(ms / 1000) * 1000).toISOString();
}

/** Case- and whitespace-insensitive scenario identity. */
export function scenarioKey(name: string): string {
  return name.trim().toLowerCase();
}

export function playKeyFor(source: PlaySource, scenarioName: string, playedAt: string | number | Date): string {
  const ms = toMs(playedAt) ?? 0;
  return `${source}:${scenarioKey(scenarioName)}:${isoSeconds(ms)}`;
}

/**
 * Where the session starts. The earliest "I am starting to train" signal within
 * the lookback wins (the player may check in, train, and only then press Launch),
 * bounded below by the last debrief so a session is never debriefed twice.
 */
export function resolveSessionWindow(input: SessionWindowInput): SessionWindow {
  const nowMs = toMs(input.now) ?? Date.now();
  const lookback = input.maxLookbackMs ?? DEFAULT_MAX_LOOKBACK_MS;
  const floor = nowMs - lookback;

  const candidates: { ms: number; anchor: SessionAnchor }[] = [];
  const baselineMs = toMs(input.baselineStartedAt);
  if (baselineMs !== null && baselineMs >= floor && baselineMs <= nowMs) candidates.push({ ms: baselineMs, anchor: 'baseline' });
  const checkinMs = toMs(input.checkinAt);
  if (checkinMs !== null && checkinMs >= floor && checkinMs <= nowMs) candidates.push({ ms: checkinMs, anchor: 'checkin' });

  let startMs: number;
  let anchor: SessionAnchor;
  if (candidates.length > 0) {
    const earliest = candidates.reduce((a, b) => (b.ms < a.ms ? b : a));
    startMs = earliest.ms;
    anchor = earliest.anchor;
  } else {
    startMs = nowMs - (input.fallbackMs ?? DEFAULT_FALLBACK_MS);
    anchor = 'fallback';
  }

  const lastDebriefMs = toMs(input.lastDebriefEndedAt);
  const notBefore = lastDebriefMs !== null ? new Date(lastDebriefMs).toISOString() : null;
  if (lastDebriefMs !== null && lastDebriefMs > startMs) startMs = lastDebriefMs;

  return { start: new Date(startMs).toISOString(), notBefore, anchor };
}

export interface CollectInput {
  window: SessionWindow;
  /** Upper bound for play timestamps (clock skew guard). Defaults to now. */
  now?: string | number | Date;
  gapMs?: number;
  recent?: RecentActivityItem[];
  totalPlay?: TotalPlayItem[];
  baselineChanges?: BaselineChange[];
  localRuns?: LocalRun[];
  persisted?: PersistedPlay[];
}

interface Candidate extends SessionPlay {
  ms: number;
  priority: number;
}

function normaliseId(id: string | number | null | undefined): string | null {
  if (id === null || id === undefined || id === '') return null;
  return String(id);
}

function candidate(
  source: PlaySource,
  scenarioName: string,
  score: number,
  ms: number,
  extra: Partial<Pick<SessionPlay, 'isChallenge' | 'leaderboardId' | 'aimType' | 'hash' | 'stored' | 'playKey'>>,
): Candidate {
  const playedAt = new Date(ms).toISOString();
  return {
    scenarioName: scenarioName.trim(),
    score: Number(score) || 0,
    playedAt,
    source,
    isChallenge: extra.isChallenge ?? true,
    leaderboardId: extra.leaderboardId ?? null,
    aimType: extra.aimType ?? null,
    hash: extra.hash ?? null,
    playKey: extra.playKey ?? playKeyFor(source, scenarioName, ms),
    stored: extra.stored ?? false,
    ms,
    // Rows already in score_history win on identity so a re-sync never writes a second row for the same run.
    priority: (extra.stored ? 10 : 0) + SOURCE_PRIORITY[source],
  };
}

/**
 * Merge every piece of evidence into the list of plays that belong to the
 * session window, oldest first.
 *
 * Rules:
 *  - Only timestamped evidence counts as a play. Baseline changes count only for
 *    scenarios with no timestamped play, and are dated at the window start so
 *    they are idempotent.
 *  - The same run reported by two sources (same scenario, timestamps within
 *    SAME_PLAY_TOLERANCE_MS) is one play; the higher-trust source wins and the
 *    other fills in missing ids / categories.
 *  - A run before the window start still belongs to the session when it is
 *    within `gapMs` of a run that does (walking backwards), so a player who
 *    presses Launch after training is not cut to their last run. Nothing at or
 *    before `window.notBefore` (the previous debrief) is ever included.
 */
export function collectSessionPlays(input: CollectInput): SessionPlay[] {
  const startMs = toMs(input.window.start) ?? 0;
  const notBeforeMs = toMs(input.window.notBefore);
  const nowMs = toMs(input.now) ?? Date.now();
  const gapMs = input.gapMs ?? DEFAULT_SESSION_GAP_MS;
  const upperMs = nowMs + 60 * 1000;

  const raw: Candidate[] = [];

  for (const row of input.persisted ?? []) {
    const ms = toMs(row.playedAt);
    if (ms === null) continue;
    raw.push(candidate(row.source, row.scenarioName, row.score, ms, {
      stored: true,
      leaderboardId: normaliseId(row.leaderboardId),
      aimType: row.aimType ?? null,
      playKey: row.playKey ?? undefined,
    }));
  }
  for (const run of input.localRuns ?? []) {
    const ms = toMs(run.playedAt);
    if (ms === null || !run.scenarioName) continue;
    raw.push(candidate('local_stats', run.scenarioName, run.score, ms, {
      isChallenge: run.isChallenge !== false,
      hash: run.hash ?? null,
    }));
  }
  for (const item of input.recent ?? []) {
    const ms = toMs(item.timestamp);
    if (ms === null || !item.scenarioName) continue;
    raw.push(candidate('kovaaks_recent', item.scenarioName, item.score, ms, {
      leaderboardId: normaliseId(item.leaderboardId),
    }));
  }
  for (const item of input.totalPlay ?? []) {
    const ms = toMs(item.epoch ?? null);
    if (ms === null || !item.scenarioName) continue;
    raw.push(candidate('kovaaks_total_play', item.scenarioName, item.score, ms, {
      leaderboardId: normaliseId(item.leaderboardId),
      aimType: item.aimType ?? null,
    }));
  }

  // Drop anything outside the plausible range before de-duplicating.
  const inRange = raw.filter((c) => c.ms <= upperMs && (notBeforeMs === null || c.ms > notBeforeMs));

  // De-duplicate the same run seen from several sources.
  inRange.sort((a, b) => a.ms - b.ms || b.priority - a.priority);
  const accepted: Candidate[] = [];
  for (const c of inRange) {
    const key = scenarioKey(c.scenarioName);
    let merged = false;
    for (let i = accepted.length - 1; i >= 0; i--) {
      const a = accepted[i];
      if (c.ms - a.ms > SAME_PLAY_TOLERANCE_MS) break;
      if (scenarioKey(a.scenarioName) !== key) continue;
      const keep = c.priority > a.priority ? c : a;
      const drop = keep === c ? a : c;
      keep.leaderboardId = keep.leaderboardId ?? drop.leaderboardId;
      keep.aimType = keep.aimType ?? drop.aimType;
      keep.hash = keep.hash ?? drop.hash;
      accepted[i] = keep;
      merged = true;
      break;
    }
    if (!merged) accepted.push(c);
  }

  // Window membership with backward gap closure.
  accepted.sort((a, b) => b.ms - a.ms);
  const selected: Candidate[] = [];
  let frontier: number | null = null;
  for (const c of accepted) {
    const inWindow = c.ms >= startMs;
    const chained = frontier !== null && frontier - c.ms <= gapMs;
    if (!inWindow && !chained) continue;
    selected.push(c);
    frontier = frontier === null ? c.ms : Math.min(frontier, c.ms);
  }

  // Baseline fallback: a moved best with no timestamped play behind it.
  const timestamped = new Set(selected.map((c) => scenarioKey(c.scenarioName)));
  for (const change of input.baselineChanges ?? []) {
    if (!change.scenarioName) continue;
    const key = scenarioKey(change.scenarioName);
    if (timestamped.has(key)) continue;
    const score = Number(change.score) || 0;
    const previous = Number(change.previousHighScore) || 0;
    if (!(score > previous)) continue;
    selected.push(candidate('kovaaks_baseline', change.scenarioName, score, startMs, {
      leaderboardId: normaliseId(change.leaderboardId),
      aimType: change.aimType ?? null,
    }));
    timestamped.add(key);
  }

  selected.sort((a, b) => a.ms - b.ms || a.scenarioName.localeCompare(b.scenarioName));
  return selected.map((c) => ({
    scenarioName: c.scenarioName,
    score: c.score,
    playedAt: c.playedAt,
    source: c.source,
    isChallenge: c.isChallenge,
    leaderboardId: c.leaderboardId,
    aimType: c.aimType,
    hash: c.hash,
    playKey: c.playKey,
    stored: c.stored,
  }));
}

export interface PRDetection {
  scenarioName: string;
  newScore: number;
  previousBest: number;
  improvementPct: number;
}

/** Best challenge score per scenario in the session, keyed by scenarioKey. */
export function sessionBests(plays: SessionPlay[]): Map<string, { scenarioName: string; score: number }> {
  const bests = new Map<string, { scenarioName: string; score: number }>();
  for (const play of plays) {
    if (!play.isChallenge) continue;
    const key = scenarioKey(play.scenarioName);
    const current = bests.get(key);
    if (!current || play.score > current.score) bests.set(key, { scenarioName: play.scenarioName, score: play.score });
  }
  return bests;
}

/**
 * PRs: the session's best challenge score beats the best known before the
 * session. `previousBest` is keyed by scenarioKey; scenarios without an entry
 * are skipped (nothing to compare against), a 0 entry means "first ever play".
 */
export function detectPrs(plays: SessionPlay[], previousBest: Map<string, number>): PRDetection[] {
  const prs: PRDetection[] = [];
  for (const [key, best] of sessionBests(plays)) {
    const previous = previousBest.get(key);
    if (previous === undefined) continue;
    if (!(best.score > previous)) continue;
    prs.push({
      scenarioName: best.scenarioName,
      newScore: best.score,
      previousBest: previous,
      improvementPct: previous > 0 ? ((best.score - previous) / previous) * 100 : 0,
    });
  }
  return prs;
}

/** Distinct scenarios played (challenge or not), in first-played order. */
export function distinctScenarios(plays: SessionPlay[]): string[] {
  const seen = new Map<string, string>();
  for (const play of plays) {
    const key = scenarioKey(play.scenarioName);
    if (!seen.has(key)) seen.set(key, play.scenarioName);
  }
  return Array.from(seen.values());
}

/** Distinct scenarios per aim category (lower-cased; missing → "other"). */
export function categoriesByScenario(plays: SessionPlay[]): Record<string, number> {
  const categoryByScenario = new Map<string, string>();
  for (const play of plays) {
    const key = scenarioKey(play.scenarioName);
    const cat = (play.aimType || '').trim().toLowerCase();
    if (!categoryByScenario.has(key) || (categoryByScenario.get(key) === '' && cat)) categoryByScenario.set(key, cat);
  }
  const categories: Record<string, number> = {};
  for (const cat of categoryByScenario.values()) {
    const label = cat || 'other';
    categories[label] = (categories[label] || 0) + 1;
  }
  return categories;
}
