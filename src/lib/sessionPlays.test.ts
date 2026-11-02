/**
 * Unit tests for the session-play selection shared with the kovaaks-scores
 * edge function (`npm test`). The main fixture is the 2 Nov 2026 session that
 * exposed the bug: the player checked in at 04:20 SGT, ran 12 scenarios from
 * two local playlists between 04:29 and 05:22, and only then pressed Launch on
 * a 36-scenario benchmark playlist. The old sync listed 27 benchmark scenarios;
 * the real session is the 12 below.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  categoriesByScenario,
  collectSessionPlays,
  detectPrs,
  distinctScenarios,
  playKeyFor,
  resolveSessionWindow,
  scenarioKey,
  type BaselineChange,
  type LocalRun,
  type PersistedPlay,
  type RecentActivityItem,
  type SessionWindow,
  type TotalPlayItem,
} from '../../supabase/functions/kovaaks-scores/sessionPlays.ts'

// ─── Fixture: 2 Nov 2026, Singapore (UTC+8) ───

/** "2026.11.02-04.29.46" in SGT → ISO. */
function sgt(stamp: string): string {
  const [date, time] = stamp.split('-')
  const [y, mo, d] = date.split('.').map(Number)
  const [h, mi, s] = time.split('.').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h - 8, mi, s)).toISOString()
}

const NOW = '2026-11-01T21:25:00.000Z' // 05:25 SGT, player back in Aim Master
const CHECKIN_AT = '2026-11-01T20:20:51.010Z' // 04:20 SGT
const BASELINE_AT = '2026-11-01T21:22:42.205Z' // 05:22 SGT — Launch pressed after training
const LAST_DEBRIEF_END = '2026-10-13T21:58:23.014Z'

// [stamp, scenario, score, challenge?] — every stats file written that morning.
const LOCAL_FILES: [string, string, number, boolean][] = [
  ['2026.11.02-04.29.46', 'Pokeball Frenzy Auto TE Wide', 2960, true],
  ['2026.11.02-04.36.09', 'Pokeball Frenzy Auto TE Wide', 3010, true],
  ['2026.11.02-04.37.30', 'Pokeball Frenzy Auto TE Wide', 3050, true],
  ['2026.11.02-04.38.42', 'Pokeball Frenzy Auto TE Wide', 3120, true],
  ['2026.11.02-04.40.14', 'Pokeball Frenzy Auto TE Wide', 2990, true],
  ['2026.11.02-04.41.36', 'Pokeball Frenzy Auto TE Wide', 3080, true],
  ['2026.11.02-04.42.29', '1w3ts reload', 98, true],
  ['2026.11.02-04.43.29', '1w3ts reload', 101, true],
  ['2026.11.02-04.45.20', '1w3ts reload', 99, true],
  ['2026.11.02-04.47.00', '1w3ts reload', 103, true],
  ['2026.11.02-04.48.09', '1w3ts reload', 100, true],
  ['2026.11.02-04.49.09', '1w3ts reload', 104, true],
  ['2026.11.02-04.50.38', '1w3ts reload', 102, true],
  ['2026.11.02-04.51.38', '1w3ts reload', 105, true],
  ['2026.11.02-04.52.55', 'voxTargetSwitch 2', 44.7, true],
  ['2026.11.02-04.53.14', 'beanTS', 13.45, false],
  ['2026.11.02-04.53.35', 'FloatTS Angelic Easy', 9, false],
  ['2026.11.02-04.54.02', 'domiSwitch Easy', 1200, false],
  ['2026.11.02-04.54.50', '1w3ts reload', 3569.6, false],
  ['2026.11.02-04.54.56', '1w3ts reload', 101, true],
  ['2026.11.02-04.55.44', '1w3ts reload', 103, true],
  ['2026.11.02-04.56.44', '1w3ts reload', 104, true],
  ['2026.11.02-04.57.58', '1w3ts reload', 102, true],
  ['2026.11.02-04.59.04', '1w3ts reload', 106, true],
  ['2026.11.02-04.59.53', '1w3ts reload', 100, true],
  ['2026.11.02-05.00.06', '1w3ts reload', 97, true],
  ['2026.11.02-05.00.17', '1w3ts reload', 99, true],
  ['2026.11.02-05.01.17', '1w3ts reload', 105, true],
  ['2026.11.02-05.02.48', '1w3ts reload', 103, true],
  ['2026.11.02-05.04.12', '1w3ts reload', 104, true],
  ['2026.11.02-05.05.02', '1w3ts reload', 106, true],
  ['2026.11.02-05.06.35', '1w3ts reload', 107, true],
  ['2026.11.02-05.07.35', '1w3ts reload', 105, true],
  ['2026.11.02-05.09.00', '1w3ts reload', 108, true],
  ['2026.11.02-05.13.44', 'ReflexFlickTargetSwitching Small - Valorant', 3140.884033, true],
  ['2026.11.02-05.14.30', 'Valorant Microshot Speed Small', 20, false],
  ['2026.11.02-05.15.01', 'Valorant Microshot Speed Small', 46, true],
  ['2026.11.02-05.15.34', 'Valorant Microshot Speed Small', 48, true],
  ['2026.11.02-05.16.08', 'Valorant Microshot Speed Small', 50, true],
  ['2026.11.02-05.17.14', '4BK - Reflex Arc Click Adapt', 71.115761, true],
  ['2026.11.02-05.17.52', '1w1t XYZ EVO', 40, false],
  ['2026.11.02-05.18.53', '1w1t XYZ EVO', 115, true],
  ['2026.11.02-05.19.42', 'Rxzu swapchik', 81, false],
  ['2026.11.02-05.19.52', '4BK - rx Reflex Flick Adapt', 12, false],
  ['2026.11.02-05.20.53', '4BK - rx Reflex Flick Adapt', 20.977999, true],
  ['2026.11.02-05.21.03', '4BK - rx Reflex Flick Adapt', 18.5, true],
  ['2026.11.02-05.22.44', '4BK - rx Reflex Flick Adapt', 19.2, true],
]

const LOCAL_RUNS: LocalRun[] = LOCAL_FILES.map(([stamp, scenarioName, score, isChallenge]) => ({
  scenarioName,
  score,
  playedAt: sgt(stamp),
  hash: isChallenge ? `hash-${scenarioKey(scenarioName)}` : null,
  isChallenge,
}))

const REAL_SCENARIOS = [
  'Pokeball Frenzy Auto TE Wide', '1w3ts reload', 'voxTargetSwitch 2', 'beanTS', 'FloatTS Angelic Easy',
  'domiSwitch Easy', 'ReflexFlickTargetSwitching Small - Valorant', 'Valorant Microshot Speed Small',
  '4BK - Reflex Arc Click Adapt', '1w1t XYZ EVO', 'Rxzu swapchik', '4BK - rx Reflex Flick Adapt',
]

/** /user/activity/recent that morning: the four new high scores, nothing else. */
const RECENT: RecentActivityItem[] = [
  { scenarioName: '4BK - rx Reflex Flick Adapt', score: 20.97, timestamp: '2026-11-01T21:20:53.664Z', leaderboardId: 103893 },
  { scenarioName: '4BK - Reflex Arc Click Adapt', score: 71.11, timestamp: '2026-11-01T21:17:15.336Z', leaderboardId: 98469 },
  { scenarioName: 'ReflexFlickTargetSwitching Small - Valorant', score: 3140.88, timestamp: '2026-11-01T21:13:45.429Z', leaderboardId: 43238 },
  { scenarioName: '1w3ts reload', score: 108, timestamp: '2026-11-01T21:09:01.308Z', leaderboardId: 215 },
  { scenarioName: 'Controlstrafes Humanoid', score: 4126, timestamp: '2026-10-31T13:54:51.594Z', leaderboardId: 130390 },
]

/** The opened benchmark playlist as /user/scenario/total-play reports it: all-time bests set long ago. */
const BENCHMARK_PLAYLIST = [
  'WhisphereRawControl', 'Whisphere', 'SmoothBot Invincible Goated', 'Leaptrack Goated 75% Slightly Larger',
  'Controlsphere rAim Easy', 'VT Controlsphere Novice S5 Hard', 'Air Angelic 4 Voltaic Easy', 'cloverRawControl Easy',
  'PGTI Voltaic Easy', 'Ground Plaza Sparky V3', 'Controlsphere OW', 'Flicker Plaza rAim Easy',
  'Polarized Hell Easy 20% Slower', 'Air Pure Intermediate', 'Air Voltaic Easy Invincible 4', 'Pokeball Frenzy Auto TE Wide',
  '1w3ts reload', 'voxTargetSwitch 2', 'beanTS', 'FloatTS Angelic Easy', 'waldoTS Intermediate', 'devTS Goated NR Static 5Bot',
  'tamTargetSwitch Smooth Easy', '1wall5targets_pasu Reload', 'VT Bounceshot Intermediate',
  '1w3ts Pasu Perfected Micro Goated Larger', 'Floating Heads Timing 400% Larger',
]
const TOTAL_PLAY: TotalPlayItem[] = BENCHMARK_PLAYLIST.map((scenarioName, i) => ({
  scenarioName,
  score: 1000 + i,
  epoch: Date.parse('2025-11-03T22:11:16.730Z') - i * 3600_000,
  leaderboardId: 500 + i,
  aimType: i % 3 === 0 ? 'tracking' : i % 3 === 1 ? 'clicking' : 'target switching',
}))

const PREVIOUS_BEST = new Map<string, number>([
  [scenarioKey('1w3ts reload'), 104],
  [scenarioKey('Pokeball Frenzy Auto TE Wide'), 3450],
  [scenarioKey('voxTargetSwitch 2'), 107],
  [scenarioKey('Valorant Microshot Speed Small'), 46],
  [scenarioKey('1w1t XYZ EVO'), 115],
  [scenarioKey('4BK - rx Reflex Flick Adapt'), 0],
])

function morningWindow(overrides: Partial<Parameters<typeof resolveSessionWindow>[0]> = {}): SessionWindow {
  return resolveSessionWindow({
    now: NOW,
    baselineStartedAt: BASELINE_AT,
    checkinAt: CHECKIN_AT,
    lastDebriefEndedAt: LAST_DEBRIEF_END,
    ...overrides,
  })
}

// ─── resolveSessionWindow ───

test('the window starts at the earliest start signal: the check-in, not the later Launch', () => {
  const window = morningWindow()
  assert.equal(window.start, CHECKIN_AT)
  assert.equal(window.anchor, 'checkin')
  assert.equal(window.notBefore, LAST_DEBRIEF_END)
})

test('a Launch before the check-in anchors the window, and stale anchors are ignored', () => {
  assert.equal(morningWindow({ baselineStartedAt: '2026-11-01T20:00:00.000Z' }).anchor, 'baseline')
  const stale = morningWindow({ checkinAt: '2026-10-31T20:20:51.010Z' })
  assert.equal(stale.anchor, 'baseline')
  assert.equal(stale.start, BASELINE_AT)
  const none = resolveSessionWindow({ now: NOW })
  assert.equal(none.anchor, 'fallback')
  assert.equal(none.start, new Date(Date.parse(NOW) - 60 * 60 * 1000).toISOString())
  assert.equal(none.notBefore, null)
})

test('the window never reaches back past the last debrief', () => {
  const window = morningWindow({ lastDebriefEndedAt: '2026-11-01T21:00:00.000Z' })
  assert.equal(window.start, '2026-11-01T21:00:00.000Z')
  assert.equal(window.notBefore, '2026-11-01T21:00:00.000Z')
})

// ─── collectSessionPlays ───

test('2 Nov session: local stats + API evidence give the 12 real scenarios, not the 27 of the opened playlist', () => {
  const plays = collectSessionPlays({
    window: morningWindow(),
    now: NOW,
    recent: RECENT,
    totalPlay: TOTAL_PLAY,
    baselineChanges: [{ scenarioName: '1w3ts reload', score: 108, previousHighScore: 104, leaderboardId: '215' }],
    localRuns: LOCAL_RUNS,
  })

  assert.deepEqual(distinctScenarios(plays).sort(), [...REAL_SCENARIOS].sort())
  assert.equal(plays.length, LOCAL_FILES.length, 'one play per stats file, API duplicates merged')
  assert.ok(plays.every((p) => p.source === 'local_stats'), 'local files win over API evidence')
  assert.equal(plays.filter((p) => !p.isChallenge).length, 8)
  // Timestamps ascend and stay inside the session.
  for (let i = 1; i < plays.length; i++) assert.ok(plays[i].playedAt >= plays[i - 1].playedAt)
  assert.equal(plays[0].playedAt, sgt('2026.11.02-04.29.46'))
  assert.equal(plays[plays.length - 1].playedAt, sgt('2026.11.02-05.22.44'))
  // The 108 run is one play: the local file (exact time) carrying the API's leaderboard id.
  const pr = plays.filter((p) => p.scenarioName === '1w3ts reload' && p.score === 108)
  assert.equal(pr.length, 1)
  assert.equal(pr[0].leaderboardId, '215')
  assert.equal(pr[0].hash, 'hash-1w3ts reload')
  // No baseline-fallback play once a timestamped run exists for the scenario.
  assert.ok(!plays.some((p) => p.source === 'kovaaks_baseline'))
  // The rest of the benchmark playlist (old epochs) is absent.
  assert.ok(!plays.some((p) => p.scenarioName === 'Whisphere'))
})

test('without a linked stats folder the API still yields only the timestamped runs of the window', () => {
  const plays = collectSessionPlays({ window: morningWindow(), now: NOW, recent: RECENT, totalPlay: TOTAL_PLAY })
  assert.deepEqual(
    plays.map((p) => p.scenarioName),
    ['1w3ts reload', 'ReflexFlickTargetSwitching Small - Valorant', '4BK - Reflex Arc Click Adapt', '4BK - rx Reflex Flick Adapt'],
  )
  assert.ok(plays.every((p) => p.source === 'kovaaks_recent' && p.isChallenge))
  assert.equal(plays[0].playKey, 'kovaaks_recent:1w3ts reload:2026-11-01T21:09:01.000Z')
})

test('Launch pressed after training: runs before the window chain backwards through the 10-minute gap', () => {
  const window = morningWindow({ checkinAt: null }) // only the 05:22 Launch anchors the window
  assert.equal(window.start, BASELINE_AT)
  const plays = collectSessionPlays({ window, now: NOW, localRuns: LOCAL_RUNS, recent: RECENT })
  assert.equal(plays.length, LOCAL_FILES.length)
  assert.equal(distinctScenarios(plays).length, 12)
})

test('a gap longer than the threshold ends the backward chain', () => {
  const window = morningWindow({ checkinAt: null })
  const lateOnly = LOCAL_RUNS.filter((r) => r.playedAt >= sgt('2026.11.02-05.13.44'))
  const early = LOCAL_RUNS.filter((r) => r.playedAt <= sgt('2026.11.02-04.52.55')) // ends 20 min before 05:13
  const plays = collectSessionPlays({ window, now: NOW, localRuns: [...early, ...lateOnly] })
  assert.equal(plays.length, lateOnly.length)
  assert.ok(!plays.some((p) => p.scenarioName === 'Pokeball Frenzy Auto TE Wide'))
})

test('nothing at or before the previous debrief is ever a play', () => {
  const window = morningWindow({ lastDebriefEndedAt: sgt('2026.11.02-05.09.30') })
  const plays = collectSessionPlays({ window, now: NOW, localRuns: LOCAL_RUNS, recent: RECENT })
  assert.ok(plays.every((p) => p.playedAt > sgt('2026.11.02-05.09.30')))
  assert.deepEqual(distinctScenarios(plays), [
    'ReflexFlickTargetSwitching Small - Valorant', 'Valorant Microshot Speed Small', '4BK - Reflex Arc Click Adapt',
    '1w1t XYZ EVO', 'Rxzu swapchik', '4BK - rx Reflex Flick Adapt',
  ])
})

test('a timestamp from the future (clock skew) is dropped', () => {
  const plays = collectSessionPlays({
    window: morningWindow(),
    now: NOW,
    recent: [{ scenarioName: 'Future', score: 1, timestamp: '2026-11-01T22:00:00.000Z' }],
  })
  assert.equal(plays.length, 0)
})

test('re-sync is idempotent: rows already in score_history keep their identity and absorb new evidence', () => {
  const persisted: PersistedPlay[] = RECENT.slice(0, 4).map((r) => ({
    scenarioName: r.scenarioName,
    score: r.score,
    playedAt: r.timestamp,
    source: 'kovaaks_recent',
    leaderboardId: String(r.leaderboardId),
    aimType: 'clicking',
    playKey: playKeyFor('kovaaks_recent', r.scenarioName, r.timestamp),
  }))
  const plays = collectSessionPlays({ window: morningWindow(), now: NOW, recent: RECENT, localRuns: LOCAL_RUNS, persisted })
  assert.equal(plays.length, LOCAL_FILES.length)
  const stored = plays.filter((p) => p.stored)
  assert.equal(stored.length, 4)
  const pr = stored.find((p) => p.scenarioName === '1w3ts reload')!
  assert.equal(pr.playedAt, '2026-11-01T21:09:01.308Z', 'stored timestamp wins over the local file stamp')
  assert.equal(pr.playKey, 'kovaaks_recent:1w3ts reload:2026-11-01T21:09:01.000Z')
  assert.equal(pr.hash, 'hash-1w3ts reload', 'the local file still fills in what the stored row lacks')
  assert.equal(plays.filter((p) => !p.stored).length, LOCAL_FILES.length - 4)
  // Running the same inputs again yields identical keys.
  const again = collectSessionPlays({ window: morningWindow(), now: NOW, recent: RECENT, localRuns: LOCAL_RUNS, persisted })
  assert.deepEqual(again.map((p) => p.playKey), plays.map((p) => p.playKey))
})

test('baseline fallback: a moved best with no timestamp is one play at the window start, unchanged bests are not', () => {
  const changes: BaselineChange[] = [
    { scenarioName: 'Whisphere', score: 14500, previousHighScore: 14430, leaderboardId: '34963', aimType: 'tracking' },
    { scenarioName: 'Controlsphere OW', score: 6468, previousHighScore: 6468 },
    { scenarioName: 'SmoothBot Invincible Goated', score: 2988, previousHighScore: 3516 },
    { scenarioName: '1w3ts reload', score: 108, previousHighScore: 104 },
  ]
  const window = morningWindow()
  const plays = collectSessionPlays({ window, now: NOW, recent: RECENT, baselineChanges: changes })
  const fallback = plays.filter((p) => p.source === 'kovaaks_baseline')
  assert.deepEqual(fallback.map((p) => p.scenarioName), ['Whisphere'])
  assert.equal(fallback[0].playedAt, window.start)
  assert.equal(fallback[0].playKey, 'kovaaks_baseline:whisphere:2026-11-01T20:20:51.000Z', 'keys are truncated to the second')
  assert.equal(fallback[0].aimType, 'tracking')
  assert.equal(plays.filter((p) => p.scenarioName === '1w3ts reload').length, 1, 'timestamped evidence suppresses the fallback')
})

test('a total-play epoch inside the window is a play; an old epoch is not', () => {
  const plays = collectSessionPlays({
    window: morningWindow(),
    now: NOW,
    totalPlay: [
      { scenarioName: 'Fresh PB', score: 10, epoch: Date.parse('2026-11-01T20:45:00.000Z'), leaderboardId: 1, aimType: 'tracking' },
      { scenarioName: 'Old PB', score: 10, epoch: Date.parse('2026-10-01T20:45:00.000Z'), leaderboardId: 2 },
      { scenarioName: 'No epoch', score: 10, epoch: null, leaderboardId: 3 },
    ],
  })
  assert.deepEqual(plays.map((p) => [p.scenarioName, p.source]), [['Fresh PB', 'kovaaks_total_play']])
})

// ─── PRs and summaries ───

test('detectPrs compares the session best of each challenge run against the previous best', () => {
  const plays = collectSessionPlays({ window: morningWindow(), now: NOW, localRuns: LOCAL_RUNS, recent: RECENT })
  const prs = detectPrs(plays, PREVIOUS_BEST).sort((a, b) => a.scenarioName.localeCompare(b.scenarioName))
  assert.deepEqual(prs, [
    { scenarioName: '1w3ts reload', newScore: 108, previousBest: 104, improvementPct: ((108 - 104) / 104) * 100 },
    { scenarioName: '4BK - rx Reflex Flick Adapt', newScore: 20.977999, previousBest: 0, improvementPct: 0 },
    { scenarioName: 'Valorant Microshot Speed Small', newScore: 50, previousBest: 46, improvementPct: ((50 - 46) / 46) * 100 },
  ])
  // 1w1t XYZ EVO equalled 115 (no PR); Pokeball stayed under 3450; the 3569.6 freeplay score of 1w3ts reload is ignored;
  // scenarios with no previous best are skipped.
})

test('distinctScenarios and categoriesByScenario count scenarios, not runs', () => {
  const plays = collectSessionPlays({ window: morningWindow(), now: NOW, localRuns: LOCAL_RUNS, recent: RECENT, totalPlay: TOTAL_PLAY })
  assert.equal(distinctScenarios(plays).length, 12)
  const categories = categoriesByScenario(plays)
  assert.equal(Object.values(categories).reduce((a, b) => a + b, 0), 12)
  assert.equal(categories.other, 12, 'local files carry no category; the benchmark epochs were outside the window')
  const tagged = plays.map((p) => ({ ...p, aimType: p.scenarioName.includes('TS') ? 'Target Switching' : null }))
  assert.deepEqual(categoriesByScenario(tagged), { other: 10, 'target switching': 2 })
})
