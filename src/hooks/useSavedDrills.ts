import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  forgetGoalLinks,
  getSnapshot,
  linkDrills,
  load,
  removeSavedDrill,
  reset,
  saveDrill,
  setCategory,
  subscribe,
  unlinkDrill,
} from '@/lib/savedDrillsStore';

/**
 * The signed-in user's saved drills and goal links, from the shared store.
 * Loads once per user; every component that calls this sees the same rows,
 * so a save made in the Home reader shows in the Goals tab at once.
 */
export function useSavedDrills() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (userId) load(userId);
    else reset();
  }, [userId]);

  return {
    saved: state.saved,
    links: state.links,
    loading: !!userId && (state.status === 'idle' || state.status === 'loading'),
    saveDrill,
    removeSavedDrill,
    setCategory,
    linkDrills,
    unlinkDrill,
    forgetGoalLinks,
  };
}
