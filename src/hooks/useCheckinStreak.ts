import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface CheckinStreakData {
  totalCheckins: number;
  last7DaysCount: number;
  isConsistent: boolean; // 3+ in last 7 days
  loading: boolean;
}

export function useCheckinStreak(): CheckinStreakData {
  const { user } = useAuth();
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [last7DaysCount, setLast7DaysCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Total non-skipped check-ins
      const { count: total } = await supabase
        .from('mental_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('skipped', false);

      // Check-ins in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recent } = await supabase
        .from('mental_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('skipped', false)
        .gte('created_at', sevenDaysAgo.toISOString());

      setTotalCheckins(total ?? 0);
      setLast7DaysCount(recent ?? 0);
    } catch (err) {
      console.error('useCheckinStreak error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    totalCheckins,
    last7DaysCount,
    isConsistent: last7DaysCount >= 3,
    loading,
  };
}
