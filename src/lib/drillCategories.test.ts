/**
 * Unit tests for drill categories.
 *
 * Runs on Node's built-in test runner with native TypeScript type stripping
 * (`npm test`).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SEED_CATEGORIES,
  categoryOptions,
  familyOf,
  groupByCategory,
  matchCategory,
  normaliseCategory,
  splitForGoal,
  suggestedCategories,
  usedCategories,
} from './drillCategories.ts'

const saves = (...categories: Array<string | null>) => categories.map(category => ({ category }))

test('the seed list has the 13 subcategories plus 3 cross-cutting ones', () => {
  assert.equal(SEED_CATEGORIES.length, 16)
  assert.equal(SEED_CATEGORIES.filter(c => c.family === 'clicking').length, 5)
  assert.equal(SEED_CATEGORIES.filter(c => c.family === 'tracking').length, 5)
  assert.equal(SEED_CATEGORIES.filter(c => c.family === 'switching').length, 3)
  assert.equal(SEED_CATEGORIES.filter(c => c.family === 'mental').length, 3)
})

test('normaliseCategory trims, collapses whitespace and returns null for blank', () => {
  assert.equal(normaliseCategory(null), null)
  assert.equal(normaliseCategory(undefined), null)
  assert.equal(normaliseCategory(''), null)
  assert.equal(normaliseCategory('   '), null)
  assert.equal(normaliseCategory('  Wrist pivots  '), 'Wrist pivots')
  assert.equal(normaliseCategory('Reactive   tracking'), 'Reactive tracking')
  assert.equal(normaliseCategory('reactive\ttracking'), 'reactive tracking')
})

test('matchCategory returns the existing spelling ignoring case, seed first', () => {
  assert.equal(matchCategory('reactive tracking', []), 'Reactive tracking')
  assert.equal(matchCategory('REACTIVE TRACKING', ['reactive tracking']), 'Reactive tracking')
  assert.equal(matchCategory('wrist pivots', ['Wrist pivots']), 'Wrist pivots')
  assert.equal(matchCategory('Wrist pivots', []), 'Wrist pivots')
})

test('familyOf knows the seed list ignoring case and nothing else', () => {
  assert.equal(familyOf('Static clicking'), 'clicking')
  assert.equal(familyOf('reactive TRACKING'), 'tracking')
  assert.equal(familyOf('Speed switching'), 'switching')
  assert.equal(familyOf('Tension and grip'), 'mental')
  assert.equal(familyOf('Wrist pivots'), null)
  assert.equal(familyOf(null), null)
})

test('suggestedCategories matches seed slugs against playbook tags', () => {
  assert.deepEqual(suggestedCategories(['aim-training', 'clicking', 'static-clicking', 'kovaaks']), ['Static clicking'])
  assert.deepEqual(suggestedCategories(['tracking', 'reactive-tracking', 'pure-reactivity']), ['Reactive tracking', 'Pure reactivity'])
  assert.deepEqual(suggestedCategories(['aim-training', 'voltaic']), [])
  assert.deepEqual(suggestedCategories([]), [])
})

test('usedCategories keeps the first spelling seen, ignoring case', () => {
  assert.deepEqual(usedCategories(saves('Wrist pivots', 'wrist pivots', null, 'Static clicking')), ['Wrist pivots', 'Static clicking'])
  assert.deepEqual(usedCategories([]), [])
})

test('categoryOptions lists the seeds in order, then typed ones alphabetically, with counts', () => {
  const options = categoryOptions(saves('Reactive tracking', 'reactive tracking', 'Zed drills', 'Alpha drills', null))
  assert.equal(options.length, 18)
  assert.deepEqual(options.slice(0, 16).map(o => o.name), SEED_CATEGORIES.map(c => c.name))
  assert.ok(options.slice(0, 16).every(o => o.seed))
  assert.equal(options.find(o => o.name === 'Reactive tracking')?.count, 2)
  assert.equal(options.find(o => o.name === 'Static clicking')?.count, 0)
  assert.deepEqual(options.slice(16), [
    { name: 'Alpha drills', count: 1, family: null, seed: false },
    { name: 'Zed drills', count: 1, family: null, seed: false },
  ])
})

test('groupByCategory orders by count, ties by name, uncategorised last and only when present', () => {
  const grouped = groupByCategory(saves('Zed', 'Alpha', 'Zed', null, 'alpha', 'Beta'))
  assert.deepEqual(grouped.map(([name, items]) => [name, items.length]), [
    ['Alpha', 2],
    ['Zed', 2],
    ['Beta', 1],
    [null, 1],
  ])
  assert.deepEqual(groupByCategory(saves('Alpha')).map(([name]) => name), ['Alpha'])
  assert.deepEqual(groupByCategory([]), [])
})

test('splitForGoal puts the goal family first and everything else after', () => {
  const all = saves('Reactive tracking', 'Static clicking', 'Smoothness tracking', 'Wrist pivots', null)

  const tracking = splitForGoal(all, 'tracking')
  assert.deepEqual(tracking.matches.map(([name]) => name), ['Reactive tracking', 'Smoothness tracking'])
  assert.deepEqual(tracking.others.map(([name]) => name), ['Static clicking', 'Wrist pivots', null])

  const consistency = splitForGoal(all, 'consistency')
  assert.deepEqual(consistency.matches, [])
  assert.equal(consistency.others.length, 5)

  const none = splitForGoal(all, null)
  assert.deepEqual(none.matches, [])
  assert.equal(none.others.length, 5)

  // A typed category is never a match, whatever the goal.
  const mental = splitForGoal(saves('Wrist pivots'), 'mental')
  assert.deepEqual(mental.matches, [])
  assert.deepEqual(mental.others.map(([name]) => name), ['Wrist pivots'])
})
