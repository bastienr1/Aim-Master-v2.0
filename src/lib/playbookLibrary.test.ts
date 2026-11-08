/**
 * Unit tests for the playbook library grouping.
 *
 * Runs on Node's built-in test runner with native TypeScript type stripping
 * (`npm test`).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { familiesOf, groupLibrary, placePlaybook } from './playbookLibrary.ts'

type Kind = 'mechanics' | 'mindset' | null
let n = 0
const pb = (title: string, tags: string[], kind: Kind = 'mechanics') => ({ id: `id-${++n}`, title, tags, kind })

test('familiesOf reads family tags, the mental-game label slug, mindset and kind', () => {
  assert.deepEqual(familiesOf({ tags: ['aim-training', 'tracking'], kind: 'mechanics' }), ['tracking'])
  assert.deepEqual(familiesOf({ tags: ['Tracking ', 'CLICKING'], kind: null }), ['clicking', 'tracking'])
  assert.deepEqual(familiesOf({ tags: ['mental-game'], kind: null }), ['mental'])
  assert.deepEqual(familiesOf({ tags: ['mindset'], kind: null }), ['mental'])
  assert.deepEqual(familiesOf({ tags: [], kind: 'mindset' }), ['mental'])
  // A seed-category slug is not a family tag.
  assert.deepEqual(familiesOf({ tags: ['reactive-tracking', 'static-clicking'], kind: null }), [])
})

test('a seed-category tag gives family and category', () => {
  assert.deepEqual(placePlaybook({ tags: ['clicking', 'static-clicking'], kind: 'mechanics' }), { group: 'clicking', category: 'Static clicking' })
  // No family tag needed.
  assert.deepEqual(placePlaybook({ tags: ['speed-switching'], kind: null }), { group: 'switching', category: 'Speed switching' })
})

test('several seed tags: the first in seed order wins, so a mechanic beats a mental seed', () => {
  assert.deepEqual(placePlaybook({ tags: ['target-reading', 'tracking', 'control-tracking'], kind: 'mechanics' }), {
    group: 'tracking',
    category: 'Control tracking',
  })
  assert.deepEqual(placePlaybook({ tags: ['pure-reactivity', 'reactive-tracking'], kind: 'mechanics' }), {
    group: 'tracking',
    category: 'Reactive tracking',
  })
})

test('a lone family tag puts the playbook in that family with no category', () => {
  assert.deepEqual(placePlaybook({ tags: ['clicking', 'static', 'kovaaks'], kind: 'mechanics' }), { group: 'clicking', category: null })
  assert.deepEqual(placePlaybook({ tags: ['mindset', 'plateaus'], kind: 'mechanics' }), { group: 'mental', category: null })
})

test('two or more families → all-round, even with a seed tag', () => {
  assert.deepEqual(placePlaybook({ tags: ['clicking', 'tracking', 'switching', 'reactive-tracking'], kind: 'mechanics' }), {
    group: 'all-round',
    category: null,
  })
  assert.deepEqual(placePlaybook({ tags: ['tracking'], kind: 'mindset' }), { group: 'all-round', category: null })
})

test('no family and no seed tag → uncategorised', () => {
  assert.deepEqual(placePlaybook({ tags: ['sensitivity', 'kovaaks'], kind: 'mechanics' }), { group: 'uncategorised', category: null })
  assert.deepEqual(placePlaybook({ tags: [], kind: null }), { group: 'uncategorised', category: null })
})

test('groupLibrary orders families, then All-round, then Uncategorised, and skips empty groups', () => {
  const groups = groupLibrary([
    pb('Loose note', ['kovaaks']),
    pb('Overview', ['clicking', 'tracking']),
    pb('Smooth', ['tracking', 'smoothness']),
    pb('Static', ['static-clicking']),
  ])
  assert.deepEqual(
    groups.map(g => [g.key, g.label, g.count]),
    [
      ['clicking', 'Clicking', 1],
      ['tracking', 'Tracking', 1],
      ['all-round', 'All-round', 1],
      ['uncategorised', 'Uncategorised', 1],
    ],
  )
})

test('inside a family: seed order, General last; inside a section: title A–Z, ties by id', () => {
  const groups = groupLibrary([
    pb('b general', ['tracking']),
    pb('Zed reactive', ['reactive-tracking']),
    pb('a general', ['tracking']),
    pb('Alpha reactive', ['tracking', 'reactive-tracking']),
    { id: 'id-b', title: 'Same', tags: ['precise-tracking'], kind: 'mechanics' as Kind },
    { id: 'id-a', title: 'Same', tags: ['precise-tracking'], kind: 'mechanics' as Kind },
  ])
  assert.equal(groups.length, 1)
  const [tracking] = groups
  assert.equal(tracking.count, 6)
  assert.deepEqual(
    tracking.sections.map(s => [s.category, s.label, s.items.map(i => i.title)]),
    [
      ['Precise tracking', 'Precise tracking', ['Same', 'Same']],
      ['Reactive tracking', 'Reactive tracking', ['Alpha reactive', 'Zed reactive']],
      [null, 'General', ['a general', 'b general']],
    ],
  )
  assert.deepEqual(tracking.sections[0].items.map(i => i.id), ['id-a', 'id-b'])
})

test('groupLibrary keeps every playbook exactly once and does not mutate its input', () => {
  const input = [pb('c', ['tracking']), pb('a', ['clicking', 'tracking']), pb('b', [])]
  const before = input.map(p => p.id)
  const groups = groupLibrary(input)
  const out = groups.flatMap(g => g.sections.flatMap(s => s.items.map(i => i.id))).sort()
  assert.deepEqual(out, [...before].sort())
  assert.deepEqual(input.map(p => p.id), before)
  assert.deepEqual(groupLibrary([]), [])
})

test('the synced vault playbooks (Nov 2026 tags) land where expected', () => {
  const vault = [
    pb('4BangerKovaaks — Core Aim Training Tips', ['aim-training', 'clicking', 'tracking', 'precision-tracking', 'kovaaks']),
    pb('4BangerKovaaks — Static Confirmations', ['aim-training', 'clicking', 'static', 'micro-correction']),
    pb('Aim Secrets — Control Tracking', ['aim-training', 'tracking', 'control-tracking', 'tension-management', 'target-reading']),
    pb('Aimlabs — Tapmaxxing', ['aim-training', 'clicking', 'aimlabs']),
    pb('Corporate Serf — 36-Day Smoothness Ladder', ['tsk', 'smoothness', 'tracking', 'sensitivity']),
    pb('MattyOw — Diagonal Tracking', ['tracking', 'reactive-tracking', 'edge-tracking']),
    pb('MattyOw — One Tip for Every Category', ['clicking', 'tracking', 'switching', 'reactive-tracking']),
    pb('MattyOw — Pure Reactivity vs Reactive Tracking', ['tracking', 'reactive-tracking', 'pure-reactivity']),
    pb('MattyOw — Static Dots Tutorial', ['clicking', 'static-clicking', 'flicking']),
    pb('Microcorrections & The Cartoon Method', ['microcorrections', 'mental-game', 'tracking', 'clicking']),
    pb('Nostalgia FPS — TSK Constant-Speed Tracking', ['tracking', 'tsk', 'smoothness']),
    pb('Unraveling the Secrets of Aim — Static Clicking Fluidity', ['clicking', 'static-clicking', 'fluidity']),
    pb('Viscose — Every Mistake', ['training-method', 'plateaus', 'mindset']),
    pb('Viscose — How to React Faster', ['tracking', 'reactive-tracking', 'target-reading']),
    pb('Viscose — What Changing Your Sensitivity Does', ['training-method', 'sensitivity', 'tracking']),
  ]
  const shape = groupLibrary(vault).map(g => [g.label, g.sections.map(s => [s.label, s.items.length])])
  assert.deepEqual(shape, [
    ['Clicking', [['Static clicking', 2], ['General', 2]]],
    ['Tracking', [['Control tracking', 1], ['Reactive tracking', 3], ['General', 3]]],
    ['Mental game', [['General', 1]]],
    ['All-round', [['General', 3]]],
  ])
})
