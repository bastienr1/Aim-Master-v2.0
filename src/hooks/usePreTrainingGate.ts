import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const CHECKIN_COOLDOWN_MS = 0;
const SKIP_COOLDOWN_MS = 0;

interface UsePreTrainingGateReturn {
  showCheckin: boolean;
  triggerCheckin: () => Promise<boolean>;
  dismissCheckin: () => void;
  completeCheckin: () => void;
  loading: boolean;
}

export function usePreTrainingGate(autoTrigger: boolean = false): UsePreTrainingGateReturn {
  const { user } = useAuth();
  const [showCheckin, setShowCheckin] = useState(false);
  const [loading, setLoading] = useState(false);
  const checkedRef = useRef(false);

  const shouldShowCheckin = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    try {
      const now = new Date();

      const { data: recentCompleted } = await supabase
        .from('mental_checkins')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('skipped', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentCompleted && recentCompleted.length > 0) {
        const elapsed = now.getTime() - new Date(recentCompleted[0].created_at).getTime();
        if (elapsed < CHECKIN_COOLDOWN_MS) return false;
      }

      const { data: recentSkipped } = await supabase
        .from('mental_checkins')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('skipped', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentSkipped && recentSkipped.length > 0) {
        const elapsed = now.getTime() - new Date(recentSkipped[0].created_at).getTime();
        if (elapsed < SKIP_COOLDOWN_MS) return false;
      }

      return true;
    } catch (err) {
      console.error('usePreTrainingGate: error checking history', err);
      return false;
    }
  }, [user]);

  useEffect(() => {
    if (!autoTrigger || !user || checkedRef.current) return;
    checkedRef.current = true;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const should = await shouldShowCheckin();
      if (!cancelled && should) setShowCheckin(true);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [autoTrigger, user, shouldShowCheckin]);

  const triggerCheckin = useCallback(async (): Promise<boolean> => {
    const should = await shouldShowCheckin();
        if (should) {
      setShowCheckin(true);
        return true;
    }
    return false;
  }, [shouldShowCheckin]);

  const dismissCheckin = useCallback(() => {
    setShowCheckin(false);
  }, []);

  const completeCheckin = useCallback(() => {
    setShowCheckin(false);
  }, []);

  return { showCheckin, triggerCheckin, dismissCheckin, completeCheckin, loading };
}
