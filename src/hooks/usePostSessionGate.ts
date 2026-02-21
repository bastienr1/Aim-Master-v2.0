import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { DEBRIEF_COOLDOWN_MS } from '@/constants/debrief-config';

interface UsePostSessionGateReturn {
  showDebrief: boolean;
  triggerDebrief: () => Promise<boolean>;
  dismissDebrief: () => void;
  completeDebrief: () => void;
}

export function usePostSessionGate(): UsePostSessionGateReturn {
  const { user } = useAuth();
  const [showDebrief, setShowDebrief] = useState(false);
  const cooldownRef = useRef<number>(0);

  const shouldShowDebrief = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    // Check local cooldown first (avoid DB query if recently completed)
    if (Date.now() - cooldownRef.current < DEBRIEF_COOLDOWN_MS) return false;

    try {
      const { data: recentDebrief } = await supabase
        .from('session_debriefs')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentDebrief && recentDebrief.length > 0) {
        const elapsed = Date.now() - new Date(recentDebrief[0].created_at).getTime();
        if (elapsed < DEBRIEF_COOLDOWN_MS) return false;
      }

      return true;
    } catch (err) {
      console.error('usePostSessionGate: error checking history', err);
      return false;
    }
  }, [user]);

  const triggerDebrief = useCallback(async (): Promise<boolean> => {
    const should = await shouldShowDebrief();
    if (should) {
      setShowDebrief(true);
      return true;
    }
    return false;
  }, [shouldShowDebrief]);

  const dismissDebrief = useCallback(() => {
    setShowDebrief(false);
  }, []);

  const completeDebrief = useCallback(() => {
    cooldownRef.current = Date.now();
    setShowDebrief(false);
  }, []);

  return { showDebrief, triggerDebrief, dismissDebrief, completeDebrief };
}
