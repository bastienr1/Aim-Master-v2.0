/**
 * Groups the playbook library by aim category, using the drill-category
 * taxonomy (`drillCategories.ts`) and nothing but the playbook's vault tags
 * and `kind`.
 *
 * How a playbook is placed:
 *  1. Family tags — `clicking`, `tracking`, `switching`, and `mental-game` /
 *     `mindset` (or `kind: mindset`) for the mental family — say which goal
 *     families it covers. Two or more families → the All-round group.
 *  2. Otherwise the first seed category whose slug is a tag
 *     (`suggestedCategories`, seed order) gives family and category.
 *  3. Otherwise a single family tag puts it under that family's General
 *     section.
 *  4. No family and no seed tag → Uncategorised.
 *
 * Order: families in `FAMILIES` order, then All-round, then Uncategorised;
 * inside a family, seed categories in seed order and General last; inside a
 * section, title A–Z (ties by id). Empty groups and sections are left out.
 *
 * Pure and dependency-free so it runs in the browser and under `npm test`.
 */

import { FAMILIES, FAMILY_LABEL, SEED_CATEGORIES, UNCATEGORISED, familyOf, slugOf, suggestedCategories, type DrillFamily } from './drillCategories.ts'
import type { Playbook } from '../types/playbook.ts'

export type LibraryGroupKey = DrillFamily | 'all-round' | 'uncategorised'

export const ALL_ROUND_LABEL = 'All-round'
export const GENERAL_LABEL = 'General'

type Placeable = Pick<Playbook, 'id' | 'title' | 'tags' | 'kind'>

export interface PlaybookPlacement {
  group: LibraryGroupKey
  /** A seed category name; null for General, All-round and Uncategorised. */
  category: string | null
}

/** Tag spellings that name a family. Keys are slugs, as the vault writes them. */
const FAMILY_TAGS: Record<string, DrillFamily> = {
  ...Object.fromEntries(FAMILIES.map(f => [f, f])),
  ...Object.fromEntries(FAMILIES.map(f => [slugOf(FAMILY_LABEL[f]), f])),
  mindset: 'mental',
}

/** Families the playbook's tags (and `kind: mindset`) name, in `FAMILIES` order. */
export function familiesOf(playbook: Pick<Playbook, 'tags' | 'kind'>): DrillFamily[] {
  const found = new Set<DrillFamily>()
  for (const tag of playbook.tags) {
    const family = FAMILY_TAGS[tag.trim().toLowerCase()]
    if (family) found.add(family)
  }
  if (playbook.kind === 'mindset') found.add('mental')
  return FAMILIES.filter(f => found.has(f))
}

/** Where one playbook sits in the library. */
export function placePlaybook(playbook: Pick<Playbook, 'tags' | 'kind'>): PlaybookPlacement {
  const families = familiesOf(playbook)
  if (families.length > 1) return { group: 'all-round', category: null }

  const category = suggestedCategories(playbook.tags)[0] ?? null
  if (category) return { group: familyOf(category) as DrillFamily, category }

  if (families.length === 1) return { group: families[0], category: null }
  return { group: 'uncategorised', category: null }
}

export interface LibrarySection<T> {
  /** Seed category name, or null for the family's General section (and the single section of All-round / Uncategorised). */
  category: string | null
  label: string
  items: T[]
}

export interface LibraryGroup<T> {
  key: LibraryGroupKey
  label: string
  count: number
  sections: LibrarySection<T>[]
}

export function groupLabel(key: LibraryGroupKey): string {
  if (key === 'all-round') return ALL_ROUND_LABEL
  if (key === 'uncategorised') return UNCATEGORISED
  return FAMILY_LABEL[key]
}

const byTitle = (a: Placeable, b: Placeable) => a.title.localeCompare(b.title) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** The library, grouped and ordered as described at the top of this file. */
export function groupLibrary<T extends Placeable>(playbooks: T[]): LibraryGroup<T>[] {
  // group key → section key ('' = General / the only section) → items
  const buckets = new Map<LibraryGroupKey, Map<string, T[]>>()
  for (const playbook of playbooks) {
    const { group, category } = placePlaybook(playbook)
    const sections = buckets.get(group) ?? new Map<string, T[]>()
    const key = category ?? ''
    sections.set(key, [...(sections.get(key) ?? []), playbook])
    buckets.set(group, sections)
  }

  const order: LibraryGroupKey[] = [...FAMILIES, 'all-round', 'uncategorised']
  const groups: LibraryGroup<T>[] = []
  for (const key of order) {
    const sections = buckets.get(key)
    if (!sections) continue

    const seedOrder = SEED_CATEGORIES.map(c => c.name).filter(name => sections.has(name))
    const sectionKeys = sections.has('') ? [...seedOrder, ''] : seedOrder
    const ordered = sectionKeys.map(sectionKey => ({
      category: sectionKey === '' ? null : sectionKey,
      label: sectionKey === '' ? GENERAL_LABEL : sectionKey,
      items: [...(sections.get(sectionKey) as T[])].sort(byTitle),
    }))

    groups.push({ key, label: groupLabel(key), count: ordered.reduce((n, s) => n + s.items.length, 0), sections: ordered })
  }
  return groups
}
