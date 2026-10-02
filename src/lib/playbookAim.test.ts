/**
 * Unit tests for the AimMaster side of the playbook port: map-less notes,
 * stored moments, and the Practice Extraction table with a Scenario column.
 *
 * Runs on Node's built-in test runner with native TypeScript type stripping
 * (`npm test`). The fixture mirrors the vault's `Aim Techniques/` notes.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePlaybookMarkdown } from './playbookParser.ts'
import { parseDrills, parseTargetCount } from './playbookDrills.ts'
import { buildPlaybook } from './playbookBuild.ts'

const NOTE = `---
title: "MattyOw — Static Dots Tutorial"
content-type: mechanics
creator: MattyOw
difficulty: intermediate
duration: 00:08:21
video_url: https://www.youtube.com/watch?v=t8sTfUr2u9s&t=275s
chapters: 2
moments: 3
drills: 3
aimmaster: tip
---

# MattyOw — Static Dots Tutorial

> [!abstract] Essence
> Fast flick, slow micro.

## Core Breakdown

### Mistake 1 — sauntering instead of flicking \`[02:18–04:14]\`

**Job:** Replace slow travel with a genuine flick.

#### Fast-flick demo run on 1w4ts \`[02:18–02:50]\`

What matters is how fast the flicks are (~02:30).

#### Bardoz method: fast flick, slow micro \`[02:50–03:09]\`

> [!tip] Bardoz method in one line
> Flicks fast, micro-corrections slow.

### Mistake 2 — the metronome in your head \`[04:14–05:42]\`

**Job:** Drop the fixed tempo.

#### Fixed tempo caps speed \`[04:14–04:49]\`

- **Far dots need an extra beat.**

---

## Practice Extraction

| # | Drill / rep | Where | Scenario | Cue to watch for | Success signal | Source |
|---|---|---|---|---|---|---|
| 1 | Two-movement constraint | KovaaK's 1w4ts — 10 runs | 1wall 4targets small | A third movement | Count falls | \`[02:50–03:09]\` |
| 2 | Break the metronome | KovaaK's — 15 min | — | Firing on the beat | Far dots get a beat | \`[04:14–04:49]\` |
| 3 | Two-head taps | aim_botz — 3 sessions | | Rhythm creeping in | Clean taps | |

## Notable Quotes
`

test('an aim note parses without map or side', () => {
  const parsed = parsePlaybookMarkdown(NOTE)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.playbook.slug, 'mattyow-static-dots-tutorial')
  assert.equal(parsed.playbook.content_type, 'mechanics')
  assert.equal(parsed.playbook.creator, 'MattyOw')
  assert.equal(parsed.playbook.video_duration_seconds, 501)
  assert.equal(parsed.playbook.description, 'Fast flick, slow micro.')
  assert.deepEqual(
    parsed.playbook.chapters.map(c => [c.chapter_number, c.start_seconds, c.end_seconds, c.depth]),
    [[1, 138, 254, 1], [2, 254, 342, 1]],
  )
  // The tip callout becomes a takeaway and leaves the notes body.
  assert.deepEqual(parsed.playbook.chapters[0].key_takeaways, [
    '**Bardoz method in one line** — Flicks fast, micro-corrections slow.',
  ])
})

test('moments are stored per chapter with closed ranges', () => {
  const result = buildPlaybook(NOTE)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.built.moments, [
    { chapter_number: 1, position: 1, label: 'Fast-flick demo run on 1w4ts', start_seconds: 138, end_seconds: 170 },
    { chapter_number: 1, position: 2, label: 'Bardoz method: fast flick, slow micro', start_seconds: 170, end_seconds: 189 },
    { chapter_number: 2, position: 1, label: 'Fixed tempo caps speed', start_seconds: 254, end_seconds: 289 },
  ])
  assert.deepEqual(result.built.warnings, [])
})

test('drills keep row order and read the Scenario column verbatim', () => {
  const { drills, warnings } = parseDrills(NOTE)
  assert.deepEqual(warnings, [])
  assert.deepEqual(drills, [
    {
      position: 1,
      title: 'Two-movement constraint',
      venue: "KovaaK's 1w4ts — 10 runs",
      scenario: '1wall 4targets small',
      cue: 'A third movement',
      success_signal: 'Count falls',
      source_start_seconds: 170,
      source_end_seconds: 189,
      target_count: 10,
    },
    {
      position: 2,
      title: 'Break the metronome',
      venue: "KovaaK's — 15 min",
      scenario: null,
      cue: 'Firing on the beat',
      success_signal: 'Far dots get a beat',
      source_start_seconds: 254,
      source_end_seconds: 289,
      target_count: null,
    },
    {
      position: 3,
      title: 'Two-head taps',
      venue: 'aim_botz — 3 sessions',
      scenario: null,
      cue: 'Rhythm creeping in',
      success_signal: 'Clean taps',
      source_start_seconds: null,
      source_end_seconds: null,
      target_count: 3,
    },
  ])
})

test('a table without a Scenario column still parses', () => {
  const legacy = NOTE.replace(/ Scenario \|/, '').replace(/\|---\|---\|---\|---\|---\|---\|---\|/, '|---|---|---|---|---|---|')
    .replace(' 1wall 4targets small |', '').replace('| — | Firing', '| Firing').replace('3 sessions | |', '3 sessions |')
  const { drills } = parseDrills(legacy)
  assert.equal(drills.length, 3)
  assert.equal(drills[0].scenario, null)
  assert.equal(drills[0].cue, 'A third movement')
})

test('target counts ignore lengths of time', () => {
  assert.equal(parseTargetCount("KovaaK's 1w4ts — 1 recorded run"), 1)
  assert.equal(parseTargetCount("KovaaK's — 3 sessions"), 3)
  assert.equal(parseTargetCount('5 or 6 Sphere Hipfire — 3 sessions'), 3)
  assert.equal(parseTargetCount('Range — 15 min'), null)
  assert.equal(parseTargetCount(null), null)
})

test('a note with no timed chapter is not a playbook', () => {
  const result = buildPlaybook('---\ntitle: Tension Management\naimmaster: tip\n---\n\n## Core Concepts\n\nProse only.\n')
  assert.equal(result.ok, false)
})
