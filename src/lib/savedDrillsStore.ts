/**
 * Shared store for saved drills and their goal links.
 *
 * Every tab stays mounted (`Dashboard.tsx`), and `useGoals` / `usePlaybookIndex`
 * each keep their own state — so a drill saved in the Home reader would not
 * reach the Goals tab until a reload. This module-level cache, read through
 * `useSyncExternalStore` in `useSavedDrills`, is what makes the reader, the
 * goal modal and the cards agree without one.
 *
 * Every write updates the cache first, then the database, and reloads on
 * failure (rollback). Writes other than `linkDrills` report their own failure
 * with a toast; `linkDrills` returns false and leaves the message to the
 * caller, which knows whether a goal was just created.
 */

import { toast } from 'sonner'
import { supabase } from './supabase.ts'
import { normaliseCategory } from './drillCategories.ts'
import { snapshotOf } from './savedDrills.ts'
import type { GoalDrill, Playbook, PlaybookDrill, SavedDrill } from '../types/playbook.ts'

export type SavedDrillsStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface SavedDrillsState {
  userId: string | null
  saved: SavedDrill[]
  links: GoalDrill[]
  status: SavedDrillsStatus
}

const INITIAL: SavedDrillsState = { userId: null, saved: [], links: [], status: 'idle' }

let state: SavedDrillsState = INITIAL
const listeners = new Set<() => void>()

function set(patch: Partial<SavedDrillsState>) {
  state = { ...state, ...patch }
  for (const listener of listeners) listener()
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSnapshot(): SavedDrillsState {
  return state
}

export function reset() {
  set(INITIAL)
}

async function fetchAll(userId: string): Promise<Pick<SavedDrillsState, 'saved' | 'links'> | null> {
  const [savedRes, linksRes] = await Promise.all([
    supabase.from('saved_drills').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('goal_drills').select('*').eq('user_id', userId).order('position').order('created_at'),
  ])
  const error = savedRes.error ?? linksRes.error
  if (error) {
    // Expected until 20261006_saved_drills_goal_link.sql has been run.
    console.error('Failed to load saved drills:', error)
    return null
  }
  return { saved: (savedRes.data ?? []) as SavedDrill[], links: (linksRes.data ?? []) as GoalDrill[] }
}

/** Loads once per signed-in user. A second call for the same user is a no-op unless the first failed. */
export async function load(userId: string) {
  if (state.userId === userId && (state.status === 'loading' || state.status === 'ready')) return
  set({ userId, status: 'loading' })
  const data = await fetchAll(userId)
  if (state.userId !== userId) return // signed out or switched while loading
  if (!data) set({ status: 'error' })
  else set({ ...data, status: 'ready' })
}

/** Rollback: the cache went ahead of the database, so re-read it. */
async function rollback(message: string, error: unknown) {
  console.error(message, error)
  const userId = state.userId
  if (userId) {
    const data = await fetchAll(userId)
    if (data && state.userId === userId) set({ ...data, status: 'ready' })
  }
}

// ─── Writes ───────────────────────────────────────────────────────────────

/** Saves a drill; returns the row. A drill already saved is returned unchanged. */
export async function saveDrill(drill: PlaybookDrill, playbook: Pick<Playbook, 'id' | 'title'>): Promise<SavedDrill | null> {
  const userId = state.userId
  if (!userId) return null

  const existing = state.saved.find(s => s.drill_id === drill.id)
  if (existing) return existing

  const row: SavedDrill = {
    ...snapshotOf(drill, playbook),
    id: crypto.randomUUID(),
    user_id: userId,
    created_at: new Date().toISOString(),
  }
  set({ saved: [...state.saved, row] })

  const { error } = await supabase.from('saved_drills').insert(row)
  if (error) {
    toast.error('Could not save the drill')
    await rollback('saveDrill failed:', error)
    return null
  }
  return row
}

/** Removes a save; its goal links go with it (cascade). Returns how many goals it was linked to. */
export async function removeSavedDrill(id: string): Promise<number> {
  const linked = state.links.filter(l => l.saved_drill_id === id).length
  set({ saved: state.saved.filter(s => s.id !== id), links: state.links.filter(l => l.saved_drill_id !== id) })

  const { error } = await supabase.from('saved_drills').delete().eq('id', id)
  if (error) {
    toast.error('Could not remove the saved drill')
    await rollback('removeSavedDrill failed:', error)
    return 0
  }
  return linked
}

/** Files a save under a category. Blank means uncategorised; an empty string is never written. */
export async function setCategory(id: string, category: string | null): Promise<void> {
  const value = normaliseCategory(category)
  set({ saved: state.saved.map(s => (s.id === id ? { ...s, category: value } : s)) })

  const { error } = await supabase.from('saved_drills').update({ category: value }).eq('id', id)
  if (error) {
    toast.error('Could not change the category')
    await rollback('setCategory failed:', error)
  }
}

/** Attaches saves to a goal; ones already attached are skipped. `position` continues after the goal's last. */
export async function linkDrills(goalId: string, savedIds: string[]): Promise<boolean> {
  const userId = state.userId
  if (!userId) return false

  const current = state.links.filter(l => l.goal_id === goalId)
  const already = new Set(current.map(l => l.saved_drill_id))
  const known = new Set(state.saved.map(s => s.id))
  const missing = [...new Set(savedIds)].filter(id => !already.has(id) && known.has(id))
  if (missing.length === 0) return true

  let position = current.reduce((max, l) => Math.max(max, l.position), -1) + 1
  const now = new Date().toISOString()
  const rows: GoalDrill[] = missing.map(saved_drill_id => ({
    id: crypto.randomUUID(),
    user_id: userId,
    goal_id: goalId,
    saved_drill_id,
    position: position++,
    created_at: now,
  }))
  set({ links: [...state.links, ...rows] })

  const { error } = await supabase.from('goal_drills').insert(rows)
  if (error) {
    await rollback('linkDrills failed:', error)
    return false
  }
  return true
}

/** Detaches one save from one goal. The save itself stays. */
export async function unlinkDrill(goalId: string, savedId: string): Promise<void> {
  set({ links: state.links.filter(l => !(l.goal_id === goalId && l.saved_drill_id === savedId)) })

  const { error } = await supabase.from('goal_drills').delete().eq('goal_id', goalId).eq('saved_drill_id', savedId)
  if (error) {
    toast.error('Could not remove the drill from the goal')
    await rollback('unlinkDrill failed:', error)
  }
}
