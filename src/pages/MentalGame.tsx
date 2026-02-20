import { useState, useEffect, useCallback } from 'react';
import { Brain } from 'lucide-react';
import { useCheckinData, type CheckinRow } from '@/hooks/useCheckinData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SummaryCards } from '@/components/mental-game/SummaryCards';
import { HistoryTimeline } from '@/components/mental-game/HistoryTimeline';
import { PatternsPlaceholder } from '@/components/mental-game/PatternsPlaceholder';
import { QuickTipCard } from '@/components/mental-game/QuickTipCard';
import { EmptyState } from '@/components/mental-game/EmptyState';
import { CheckinButton } from '@/components/dashboard/CheckinButton';

interface MentalGameProps {
  onTriggerCheckin: () => void;
}

const PAGE_SIZE = 5;

export function MentalGame({ onTriggerCheckin }: MentalGameProps) {
  const { user } = useAuth();
  const { getCheckinCount, getCheckinHistory } = useCheckinData();

  const [totalCheckins, setTotalCheckins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [avgReadiness, setAvgReadiness] = useState<number | null>(null);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const computeStreak = useCallback((rows: CheckinRow[]): number => {
    const dates = new Set<string>();
    for (const row of rows) {
      if (!row.skipped) {
        const d = new Date(row.created_at);
        dates.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        );
      }
    }

    if (dates.size === 0) return 0;

    const sorted = Array.from(dates).sort().reverse();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const mostRecent = sorted[0];
    if (mostRecent !== todayStr && mostRecent !== yesterdayStr) return 0;

    let streakCount = 0;
    let checkDate = new Date(today);

    for (let i = 0; i < 365; i++) {
      const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (dates.has(dateStr)) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }

    return streakCount;
  }, []);

  const computeAvgReadiness = useCallback((rows: CheckinRow[]): number | null => {
    const valid = rows.filter((r) => !r.skipped);
    if (valid.length === 0) return null;

    let sum = 0;
    let count = 0;

    for (const row of valid) {
      const levels = [row.energy_level, row.focus_level, row.mood_level].filter(
        (v): v is number => v !== null
      );
      if (levels.length > 0) {
        const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
        sum += avg;
        count++;
      }
    }

    return count > 0 ? sum / count : null;
  }, []);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [count, history] = await Promise.all([
        getCheckinCount(),
        getCheckinHistory(20),
      ]);

      const { data: allRows } = await supabase
        .from('mental_checkins')
        .select('created_at, skipped')
        .eq('user_id', user.id)
        .eq('skipped', false)
        .order('created_at', { ascending: false })
        .limit(365);

      setTotalCheckins(count);
      setCheckins(history);
      setStreak(computeStreak((allRows ?? []) as CheckinRow[]));
      setAvgReadiness(computeAvgReadiness(history));
      setIsEmpty(count === 0 && history.length === 0);
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      console.error('MentalGame loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getCheckinCount, getCheckinHistory, computeStreak, computeAvgReadiness]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShowMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, checkins.length));
  }, [checkins.length]);

  // Show empty state for first-time users
  if (!loading && isEmpty) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#53CADC]/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#53CADC]" />
            </div>
            <div>
              <h1 className="font-['Rajdhani'] text-[28px] font-bold text-[#ECE8E1] leading-none">
                Mental Game
              </h1>
              <p className="text-sm font-['Inter'] text-[#9CA8B3] mt-0.5">
                Your mental performance data
              </p>
            </div>
          </div>
        </div>

        <EmptyState onStartCheckin={onTriggerCheckin} />
      </div>
    );
  }

  const visibleCheckins = checkins.slice(0, visibleCount);
  const hasMore = visibleCount < checkins.length;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#53CADC]/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-[#53CADC]" />
          </div>
          <div>
            <h1 className="font-['Rajdhani'] text-[28px] font-bold text-[#ECE8E1] leading-none">
              Mental Game
            </h1>
            <p className="text-sm font-['Inter'] text-[#9CA8B3] mt-0.5">
              Your mental performance data
            </p>
          </div>
        </div>
        <CheckinButton onClick={onTriggerCheckin} />
      </div>

      {/* Section 1 — Summary Cards */}
      <section className="mb-8">
        <SummaryCards
          totalCheckins={totalCheckins}
          streak={streak}
          avgReadiness={avgReadiness}
          loading={loading}
        />
      </section>

      {/* Section 2 — History Timeline */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
            Check-in History
          </h2>
          {!loading && checkins.length > 0 && (
            <span className="text-[12px] font-['Inter'] text-[#5A6872]">
              Showing {visibleCheckins.length} of {checkins.length} check-ins
            </span>
          )}
        </div>
        <HistoryTimeline checkins={visibleCheckins} loading={loading} />
        {!loading && hasMore && (
          <div className="flex justify-center mt-3">
            <button
              onClick={handleShowMore}
              className="text-[13px] font-['Inter'] text-[#53CADC] bg-transparent border-none cursor-pointer py-1.5 px-1 hover:underline transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#53CADC]/50 rounded"
            >
              Show more
            </button>
          </div>
        )}
      </section>

      {/* Section 3 — Patterns Placeholder */}
      <section className="mb-8">
        <PatternsPlaceholder totalCheckins={totalCheckins} loading={loading} />
      </section>

      {/* Section 4 — Quick Tips */}
      <section className="mb-8">
        <QuickTipCard />
      </section>
    </div>
  );
}
