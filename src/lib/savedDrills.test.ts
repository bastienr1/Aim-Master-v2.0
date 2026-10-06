/**
 * Unit tests for the saved-drill snapshot and the goal joins (`npm test`).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { drillsForGoal, goalCountBySave, mergeScenarios, snapshotChanged, snapshotOf } from './savedDrills.ts'
import type { GoalDrill, PlaybookDrill, SavedDrill } from '../types/playbook.ts'

const drill: PlaybookDrill = {
  id: 'drill-1',
  playbook_id: 'pb-1',
  position: 1,
  title: 'Follow the long bias',
  venue: "KovaaK's Air Voltaic — 5 runs",
  scenario: 'Air Voltaic',
  cue: 'Lead the target',
  success_signal: 'Fewer overshoots',
  source_start_seconds: 211,
  source_end_seconds: 247,
  target_count: 5,
}

const save = (id: string, extra: Partial<SavedDrill> = {}): SavedDrill => ({
  id,
  user_id: 'u',
  drill_id: null,
  playbook_id: null,
  category: null,
  title: id,
  venue: null,
  scenario: null,
  cue: null,
  success_signal: null,
  source_start_seconds: null,
  source_end_seconds: null,
  source_title: null,
  note: null,
  created_at: '2026-10-06T00:00:00Z',
  ...extra,
})

const link = (goal_id: string, saved_drill_id: string, position: number, created_at = '2026-10-06T00:00:00Z'): GoalDrill => ({
  id: `${goal_id}:${saved_drill_id}`,
  user_id: 'u',
  goal_id,
  saved_drill_id,
  position,
  created_at,
})

test('snapshotOf copies every drill field, the playbook id and title, with a null category', () => {
  assert.deepEqual(snapshotOf(drill, { id: 'pb-1', title: 'One Tip for Every Category' }), {
    drill_id: 'drill-1',
    playbook_id: 'pb-1',
    category: null,
    title: 'Follow the long bias',
    venue: "KovaaK's Air Voltaic — 5 runs",
    scenario: 'Air Voltaic',
    cue: 'Lead the target',
    success_signal: 'Fewer overshoots',
    source_start_seconds: 211,
    source_end_seconds: 247,
    source_title: 'One Tip for Every Category',
    note: null,
  })
})

test('snapshotChanged only when a live title exists and differs after trimming', () => {
  assert.equal(snapshotChanged({ title: 'Flick back' }, null), false)
  assert.equal(snapshotChanged({ title: 'Flick back' }, 'Flick back'), false)
  assert.equal(snapshotChanged({ title: 'Flick back' }, '  Flick back  '), false)
  assert.equal(snapshotChanged({ title: 'Flick back' }, 'Flick back, release on landing'), true)
})

test('mergeScenarios keeps existing first, drops nulls, de-duplicates ignoring case', () => {
  const picked = [{ scenario: 'Air Voltaic' }, { scenario: null }, { scenario: 'air voltaic' }, { scenario: ' 1w4ts ' }, { scenario: '' }]
  assert.deepEqual(mergeScenarios([], picked), ['Air Voltaic', '1w4ts'])
  assert.deepEqual(mergeScenarios(['1w4ts', 'Pasu'], picked), ['1w4ts', 'Pasu', 'Air Voltaic'])
  assert.deepEqual(mergeScenarios(['Pasu'], []), ['Pasu'])
})

test('drillsForGoal follows link position then created_at and skips a missing save', () => {
  const saved = [save('a'), save('b'), save('c')]
  const links = [
    link('g1', 'c', 2),
    link('g1', 'a', 1),
    link('g1', 'b', 1, '2026-10-05T00:00:00Z'),
    link('g1', 'missing', 0),
    link('g2', 'a', 0),
  ]
  assert.deepEqual(drillsForGoal('g1', links, saved).map(s => s.id), ['b', 'a', 'c'])
  assert.deepEqual(drillsForGoal('g2', links, saved).map(s => s.id), ['a'])
  assert.deepEqual(drillsForGoal('g3', links, saved), [])
})

test('goalCountBySave counts links per save', () => {
  const counts = goalCountBySave([link('g1', 'a', 0), link('g2', 'a', 0), link('g1', 'b', 1)])
  assert.equal(counts.get('a'), 2)
  assert.equal(counts.get('b'), 1)
  assert.equal(counts.get('c'), undefined)
})
