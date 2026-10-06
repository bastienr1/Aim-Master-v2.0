/**
 * Aim categories for saved drills.
 *
 * A category is free text on the save. The seed list is the vocabulary the
 * playbooks already use — the 13 subcategories of MattyOw's *One Tip for Every
 * Aim Training Category* plus three cross-cutting ones — and each seed belongs
 * to a goal family, which is what lets a Tracking goal list tracking drills
 * first. A typed category has no family and sorts after.
 *
 * Pure and dependency-free so it runs in the browser and under `npm test`.
 */

import type { GoalCategory } from '../types/goals.ts'
import type { SavedDrill } from '../types/playbook.ts'

export type DrillFamily = Extract<GoalCategory, 'clicking' | 'tracking' | 'switching' | 'mental'>

/** Order is the order offered in the picker. */
export const SEED_CATEGORIES: Array<{ name: string; family: DrillFamily }> = [
  { name: 'Static clicking', family: 'clicking' },
  { name: 'XY dynamic clicking', family: 'clicking' },
  { name: 'Bounce and arc dynamic', family: 'clicking' },
  { name: 'Linear clicking', family: 'clicking' },
  { name: 'Elusive clicking', family: 'clicking' },
  { name: 'Precise tracking', family: 'tracking' },
  { name: 'Smoothness tracking', family: 'tracking' },
  { name: 'Control tracking', family: 'tracking' },
  { name: 'Reactive tracking', family: 'tracking' },
  { name: 'Pure reactivity', family: 'tracking' },
  { name: 'Speed switching', family: 'switching' },
  { name: 'Evasive switching', family: 'switching' },
  { name: 'Stability switching', family: 'switching' },
  { name: 'Tension and grip', family: 'mental' },
  { name: 'Target reading', family: 'mental' },
  { name: 'Mindset and routine', family: 'mental' },
]

export const FAMILIES: DrillFamily[] = ['clicking', 'tracking', 'switching', 'mental']

export const FAMILY_LABEL: Record<DrillFamily, string> = {
  clicking: 'Clicking',
  tracking: 'Tracking',
  switching: 'Switching',
  mental: 'Mental game',
}

export const UNCATEGORISED = 'Uncategorised'

const fold = (name: string) => name.trim().toLowerCase()

/** Trimmed, inner whitespace collapsed; null for blank. Case kept as typed. */
export function normaliseCategory(raw: string | null | undefined): string | null {
  if (raw == null) return null
  const name = raw.replace(/\s+/g, ' ').trim()
  return name === '' ? null : name
}

/** Existing spelling ignoring case (seed first, then `existing`), or the input when new. */
export function matchCategory(name: string, existing: string[]): string {
  const key = fold(name)
  const seed = SEED_CATEGORIES.find(c => fold(c.name) === key)
  if (seed) return seed.name
  return existing.find(c => fold(c) === key) ?? name
}

/** Family of a category ignoring case; null for one not in the seed list. */
export function familyOf(category: string | null): DrillFamily | null {
  if (category == null) return null
  const key = fold(category)
  return SEED_CATEGORIES.find(c => fold(c.name) === key)?.family ?? null
}

/** Distinct categories in use, first spelling seen, ignoring case. */
export function usedCategories(saved: Pick<SavedDrill, 'category'>[]): string[] {
  const seen = new Map<string, string>()
  for (const { category } of saved) {
    if (!category) continue
    const key = fold(category)
    if (!seen.has(key)) seen.set(key, category)
  }
  return [...seen.values()]
}

/** 'Static clicking' → 'static-clicking', the tag spelling of the vault notes. */
export function slugOf(name: string): string {
  return fold(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** Seed categories whose slug is among the playbook's tags, in seed order. */
export function suggestedCategories(tags: string[]): string[] {
  const set = new Set(tags.map(t => t.trim().toLowerCase()))
  return SEED_CATEGORIES.filter(c => set.has(slugOf(c.name))).map(c => c.name)
}

export interface CategoryOption {
  name: string
  count: number
  family: DrillFamily | null
  seed: boolean
}

/** Seed list in order, then used-but-not-seed alphabetically; counts from `saved`. */
export function categoryOptions(saved: Pick<SavedDrill, 'category'>[]): CategoryOption[] {
  const counts = new Map<string, number>()
  for (const { category } of saved) {
    if (!category) continue
    const key = fold(category)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const seeds: CategoryOption[] = SEED_CATEGORIES.map(c => ({
    name: c.name,
    count: counts.get(fold(c.name)) ?? 0,
    family: c.family,
    seed: true,
  }))

  const typed: CategoryOption[] = usedCategories(saved)
    .filter(name => familyOf(name) === null)
    .sort((a, b) => a.localeCompare(b))
    .map(name => ({ name, count: counts.get(fold(name)) ?? 0, family: null, seed: false }))

  return [...seeds, ...typed]
}

/**
 * Category first: [name | null, drills[]], count desc then name, null last and
 * only when present. Grouping ignores case; the first spelling seen is shown.
 */
export function groupByCategory<T extends Pick<SavedDrill, 'category'>>(saved: T[]): Array<[string | null, T[]]> {
  const groups = new Map<string, { name: string; items: T[] }>()
  const uncategorised: T[] = []

  for (const item of saved) {
    if (!item.category) {
      uncategorised.push(item)
      continue
    }
    const key = fold(item.category)
    const group = groups.get(key)
    if (group) group.items.push(item)
    else groups.set(key, { name: item.category, items: [item] })
  }

  const ordered: Array<[string | null, T[]]> = [...groups.values()]
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
    .map(g => [g.name, g.items])

  if (uncategorised.length > 0) ordered.push([null, uncategorised])
  return ordered
}

/** The family a goal category belongs to; null for consistency, custom and no category. */
export function familyOfGoal(goalCategory: GoalCategory | null | undefined): DrillFamily | null {
  return goalCategory && (FAMILIES as string[]).includes(goalCategory) ? (goalCategory as DrillFamily) : null
}

/**
 * For the goal picker. `matches` = saves whose family equals the goal's category;
 * `others` = the rest. A goal category with no family (consistency, custom, null)
 * puts everything in `others`. Each side grouped with groupByCategory.
 */
export function splitForGoal<T extends Pick<SavedDrill, 'category'>>(
  saved: T[],
  goalCategory: GoalCategory | null,
): { matches: Array<[string | null, T[]]>; others: Array<[string | null, T[]]> } {
  const family = familyOfGoal(goalCategory)
  if (!family) return { matches: [], others: groupByCategory(saved) }

  const matches = saved.filter(s => familyOf(s.category) === family)
  const others = saved.filter(s => familyOf(s.category) !== family)
  return { matches: groupByCategory(matches), others: groupByCategory(others) }
}
