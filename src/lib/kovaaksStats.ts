/**
 * Parsers for the KovaaK's local stats folder
 * (`...\FPSAimTrainer\FPSAimTrainer\stats`). Pure; tested in kovaaksStats.test.ts.
 *
 * KovaaK's writes one CSV per run:
 *   `<Scenario> - Challenge - YYYY.MM.DD-HH.MM.SS Stats.csv`  — a completed challenge run
 *   `<Scenario> - YYYY.MM.DD-HH.MM.SS Stats.csv`              — freeplay or an aborted run
 * The stamp is the machine's local time at the end of the run. The file ends
 * with a summary block of `Label:,value` lines (Score, Scenario, Hash, ...).
 */

export interface LocalDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface ParsedStatsFilename {
  scenarioName: string;
  isChallenge: boolean;
  local: LocalDateParts;
  /** ISO timestamp, interpreting the stamp in this machine's time zone. */
  playedAt: string;
  playedAtMs: number;
}

export interface StatsSummary {
  score: number | null;
  scenario: string | null;
  hash: string | null;
  challengeStart: string | null;
  kills: number | null;
  hitCount: number | null;
  missCount: number | null;
}

/** The shape the sync edge function accepts as `localRuns`. */
export interface LocalRunPayload {
  scenarioName: string;
  score: number;
  playedAt: string;
  hash: string | null;
  isChallenge: boolean;
}

const STAMP = String.raw`(\d{4})\.(\d{2})\.(\d{2})-(\d{2})\.(\d{2})\.(\d{2}) Stats\.csv$`;
const CHALLENGE_RE = new RegExp(`^(.*?) - Challenge - ${STAMP}`);
const FREEPLAY_RE = new RegExp(`^(.*?) - ${STAMP}`);

export function localPartsToDate(p: LocalDateParts): Date {
  return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, 0);
}

export function parseStatsFilename(name: string): ParsedStatsFilename | null {
  let isChallenge = true;
  let m = CHALLENGE_RE.exec(name);
  if (!m) {
    isChallenge = false;
    m = FREEPLAY_RE.exec(name);
  }
  if (!m) return null;
  const scenarioName = m[1].trim();
  if (!scenarioName) return null;
  const local: LocalDateParts = {
    year: Number(m[2]),
    month: Number(m[3]),
    day: Number(m[4]),
    hour: Number(m[5]),
    minute: Number(m[6]),
    second: Number(m[7]),
  };
  const date = localPartsToDate(local);
  if (Number.isNaN(date.getTime())) return null;
  return {
    scenarioName,
    isChallenge,
    local,
    playedAt: date.toISOString(),
    playedAtMs: date.getTime(),
  };
}

function summaryValue(lines: string[], label: string): string | null {
  const prefix = `${label}:,`;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.startsWith(prefix)) return line.slice(prefix.length).trim();
  }
  return null;
}

function numberOrNull(value: string | null): number | null {
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Read the summary block at the end of a stats CSV. Tolerates CRLF and a BOM. */
export function parseStatsCsv(text: string): StatsSummary {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const lines = body.split(/\r?\n/);
  const scenario = summaryValue(lines, 'Scenario');
  const hash = summaryValue(lines, 'Hash');
  return {
    score: numberOrNull(summaryValue(lines, 'Score')),
    scenario: scenario ? scenario : null,
    hash: hash ? hash : null,
    challengeStart: summaryValue(lines, 'Challenge Start'),
    kills: numberOrNull(summaryValue(lines, 'Kills')),
    hitCount: numberOrNull(summaryValue(lines, 'Hit Count')),
    missCount: numberOrNull(summaryValue(lines, 'Miss Count')),
  };
}

/**
 * One local run from a file name and its contents. Returns null when the file
 * is not a stats file or has no score. A run counts as a challenge only when
 * both the file name says so and the summary names the scenario (freeplay
 * files leave `Scenario:` empty).
 */
export function localRunFromStats(fileName: string, text: string): LocalRunPayload | null {
  const parsed = parseStatsFilename(fileName);
  if (!parsed) return null;
  const summary = parseStatsCsv(text);
  if (summary.score === null) return null;
  return {
    scenarioName: parsed.scenarioName,
    score: summary.score,
    playedAt: parsed.playedAt,
    hash: summary.hash,
    isChallenge: parsed.isChallenge && summary.scenario !== null,
  };
}
