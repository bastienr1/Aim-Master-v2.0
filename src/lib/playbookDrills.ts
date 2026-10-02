/**
 * The `## Practice Extraction` table of a playbook note → drills.
 *
 * Ported from VAL Master (`parseDrills` in `src/lib/vodLibraryParser.ts`), plus
 * one AimMaster column: an optional `Scenario` cell holding the exact KovaaK's
 * scenario name the drill is run in. It is stored verbatim and never guessed
 * from the free-text `Where` cell — wrong coaching is worse than none.
 *
 * Pure and dependency-free so it runs in the browser and under `npm test`.
 */

import { parseTimestamp } from './playbookParser.ts'

export interface ParsedDrill {
  /** Row order, 1-based. A drill's identity across re-syncs — never the `#` cell. */
  position: number
  title: string
  /** The `Where` cell as written, e.g. "KovaaK's 1w4ts — 10 runs". */
  venue: string | null
  /** The `Scenario` cell: an exact KovaaK's scenario name, or null. */
  scenario: string | null
  cue: string | null
  success_signal: string | null
  source_start_seconds: number | null
  source_end_seconds: number | null
  /** "10 runs" / "3 sessions" → 10 / 3. Minutes and hours are lengths, not counts. */
  target_count: number | null
}

export interface ParsedDrills {
  drills: ParsedDrill[]
  warnings: string[]
}

const TS = String.raw`\d{1,2}(?::\d{2}){1,2}`
/** The first `[MM:SS–MM:SS]` anywhere in a cell — Source cells sometimes list two. */
const ANY_RANGE = new RegExp(String.raw`\[\s*(${TS})\s*[–—-]\s*(${TS})\s*\]`)
const SEPARATOR_ROW = /^\|?[\s:-]+\|[\s:|-]*$/

function splitCells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
}

/** `10 runs` → 10, `3 sessions` → 3, `1 recorded run` → 1, `15 min` → null. */
export function parseTargetCount(venue: string | null): number | null {
  if (!venue) return null
  const pattern = /(\d+)\s+((?:[\w'’-]+\s+){0,2}?)(run|round|session|rep|pass|play|min|minute|hour)(?:e?s)?\b/gi
  for (const match of venue.matchAll(pattern)) {
    const unit = match[3].toLowerCase()
    if (unit === 'min' || unit === 'minute' || unit === 'hour') continue
    return Number(match[1])
  }
  return null
}

/**
 * Columns are located by header text rather than by index, so a note that adds
 * or reorders one still syncs. Takes the note body or the whole note — only the
 * lines after `## Practice Extraction` are read.
 */
export function parseDrills(markdown: string): ParsedDrills {
  const lines = markdown.split(/\r?\n/)

  const start = lines.findIndex(line => /^##\s+practice extraction\b/i.test(line))
  if (start === -1) return { drills: [], warnings: ['no Practice Extraction section'] }

  const end = lines.findIndex((line, i) => i > start && /^##\s+/.test(line))
  const block = lines.slice(start + 1, end === -1 ? lines.length : end)

  const headerIndex = block.findIndex(
    (line, i) => line.trim().startsWith('|') && SEPARATOR_ROW.test(block[i + 1] ?? ''),
  )
  if (headerIndex === -1) return { drills: [], warnings: ['Practice Extraction has no table'] }

  const header = splitCells(block[headerIndex]).map(cell => cell.toLowerCase())
  const columnFor = (...prefixes: string[]) =>
    header.findIndex(cell => prefixes.some(prefix => cell.startsWith(prefix)))

  const titleIdx = columnFor('drill', 'rep')
  const venueIdx = columnFor('where', 'venue')
  const scenarioIdx = columnFor('scenario')
  const cueIdx = columnFor('cue')
  const successIdx = columnFor('success')
  const sourceIdx = columnFor('source')

  if (titleIdx === -1) {
    return { drills: [], warnings: [`Practice Extraction table has no Drill column (${header.join(' | ')})`] }
  }

  const cell = (cells: string[], idx: number) => (idx === -1 ? null : cells[idx]?.trim() || null)

  const drills: ParsedDrill[] = []
  for (const row of block.slice(headerIndex + 2)) {
    if (!row.trim().startsWith('|')) break // the table ends at the first non-row
    const cells = splitCells(row)
    const title = cells[titleIdx]?.trim()
    if (!title) continue

    const venue = cell(cells, venueIdx)
    const range = (cell(cells, sourceIdx) ?? '').match(ANY_RANGE)
    const sourceStart = range ? parseTimestamp(range[1]) : null
    const sourceEnd = range ? parseTimestamp(range[2]) : null

    drills.push({
      position: drills.length + 1,
      title,
      venue,
      // A dash or "n/a" in the cell means "no scenario", not a scenario called "—".
      scenario: (cell(cells, scenarioIdx) ?? '').replace(/^(?:[-–—]+|n\/?a)$/i, '').replace(/^`|`$/g, '') || null,
      cue: cell(cells, cueIdx),
      success_signal: cell(cells, successIdx),
      source_start_seconds: sourceStart,
      source_end_seconds: sourceEnd,
      target_count: parseTargetCount(venue),
    })
  }

  return { drills, warnings: drills.length === 0 ? ['Practice Extraction table has no rows'] : [] }
}
