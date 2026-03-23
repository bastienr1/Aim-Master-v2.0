import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

function detectBrowserTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
  catch { return 'UTC'; }
}

export function useTimezone() {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState<string>(detectBrowserTz());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('timezone')
        .eq('id', user.id)
        .single();

      const stored = data?.timezone;
      const browser = detectBrowserTz();

      if (!stored || stored === 'UTC') {
        await supabase.from('profiles').update({ timezone: browser }).eq('id', user.id);
        setTimezone(browser);
      } else {
        setTimezone(stored);
      }
      setLoading(false);
    })();
  }, [user]);

  const updateTimezone = useCallback(async (tz: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ timezone: tz }).eq('id', user.id);
    if (!error) setTimezone(tz);
  }, [user]);

  return { timezone, loading, updateTimezone, detectBrowserTz };
}
