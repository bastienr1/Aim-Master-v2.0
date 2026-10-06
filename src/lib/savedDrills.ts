/**
 * Saved drills: the snapshot taken when a drill is bookmarked, and the small
 * joins the goal screens need. Pure — the store does the Supabase writes.
 */

import type { GoalDrill, Playbook, PlaybookDrill, SavedDrill } from '../types/playbook.ts'

export type SavedDrillSnapshot = Omit<SavedDrill, 'id' | 'user_id' | 'created_at'>

/** The row to insert for a drill: the text copy, playbook id and title. Category null. */
export function snapshotOf(drill: PlaybookDrill, playbook: Pick<Playbook, 'id' | 'title'>): SavedDrillSnapshot {
  return {
    drill_id: drill.id,
    playbook_id: playbook.id,
    category: null,
    title: drill.title,
    venue: drill.venue,
    scenario: drill.scenario,
    cue: drill.cue,
    success_signal: drill.success_signal,
    source_start_seconds: drill.source_start_seconds,
    source_end_seconds: drill.source_end_seconds,
    source_title: playbook.title,
    note: null,
  }
}

/** True when a live title exists and differs from the saved one after trimming. */
export function snapshotChanged(saved: Pick<SavedDrill, 'title'>, liveTitle: string | null): boolean {
  if (liveTitle == null) return false
  return liveTitle.trim() !== saved.title.trim()
}

/** Non-empty scenarios of the picked saves, de-duplicated ignoring case, merged after `existing`. */
export function mergeScenarios(existing: string[], picked: Pick<SavedDrill, 'scenario'>[]): string[] {
  const out = [...existing]
  const seen = new Set(existing.map(s => s.trim().toLowerCase()))
  for (const { scenario } of picked) {
    const name = scenario?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

/** Saves linked to a goal, in link `position` then `created_at` order. A link whose save is missing is skipped. */
export function drillsForGoal(goalId: string, links: GoalDrill[], saved: SavedDrill[]): SavedDrill[] {
  const byId = new Map(saved.map(s => [s.id, s]))
  return links
    .filter(l => l.goal_id === goalId)
    .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
    .map(l => byId.get(l.saved_drill_id))
    .filter((s): s is SavedDrill => s !== undefined)
}

/** How many goals each save is linked to. */
export function goalCountBySave(links: GoalDrill[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const l of links) counts.set(l.saved_drill_id, (counts.get(l.saved_drill_id) ?? 0) + 1)
  return counts
}
