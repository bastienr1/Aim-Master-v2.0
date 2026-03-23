import { useState, useEffect, useCallback } from 'react';
import { Brain, List, CalendarDays } from 'lucide-react';
import { useCheckinData } from '@/hooks/useCheckinData';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedSessions } from '@/hooks/useUnifiedSessions';
import { UnifiedSessionCard } from '@/components/mental-game/UnifiedSessionCard';
import { SessionCalendarView } from '@/components/mental-game/SessionCalendarView';
import { PatternsPlaceholder } from '@/components/mental-game/PatternsPlaceholder';
import { QuickTipCard } from '@/components/mental-game/QuickTipCard';
import { EmptyState } from '@/components/mental-game/EmptyState';
import { CheckinButton } from '@/components/dashboard/CheckinButton';
import { useWeeklyRecap } from '@/hooks/useWeeklyRecap';
import { PinnedRecapCard, GenerateRecapPrompt } from '@/components/mental-game/PinnedRecapCard';
import { WeeklyRecapFull } from '@/components/mental-game/WeeklyRecapFull';
import { getISOWeekNumber } from '@/lib/weekBounds';

interface MentalGameProps {
  onTriggerCheckin: () => void;
}

export function MentalGame({ onTriggerCheckin }: MentalGameProps) {
  const { user } = useAuth();
  const { getCheckinCount } = useCheckinData();

  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showFullRecap, setShowFullRecap] = useState(false);
  const {
    pinnedRecap,
    isDismissed,
    needsGeneration,
    isGenerating,
    loading: recapLoading,
    dismissRecap,
    showRecap,
    generateRecap,
  } = useWeeklyRecap();
  const { sessions: unifiedSessions, loading: unifiedLoading, totalCount: unifiedTotalCount } = useUnifiedSessions(20);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const count = await getCheckinCount();
      setIsEmpty(count === 0);
    } catch (err) {
      console.error('MentalGame loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getCheckinCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Full Recap View
  if (showFullRecap && pinnedRecap) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <WeeklyRecapFull recap={pinnedRecap} onBack={() => setShowFullRecap(false)} />
      </div>
    );
  }

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

      {/* Section 0 — Pinned Weekly Recap */}
      {!recapLoading && pinnedRecap && (
        <section className="mb-6">
          <PinnedRecapCard
            recap={pinnedRecap}
            isDismissed={isDismissed}
            onDismiss={dismissRecap}
            onShow={showRecap}
            onViewFull={() => setShowFullRecap(true)}
          />
        </section>
      )}
      {!recapLoading && !pinnedRecap && needsGeneration && (
        <section className="mb-6">
          <GenerateRecapPrompt
            weekNumber={getISOWeekNumber(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())}
            onGenerate={() => generateRecap()}
            isGenerating={isGenerating}
          />
        </section>
      )}

      {/* Section 2 — Unified Session History */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
            Session History
          </h2>
          <div className="flex gap-1 bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.06]">
            <button
              onClick={() => setViewMode('list')}
              className={`font-['Rajdhani'] text-[12px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md border-none cursor-pointer flex items-center gap-1.5 transition-all ${viewMode === 'list' ? 'bg-[#53CADC]/12 text-[#53CADC]' : 'bg-transparent text-[#5A6872] hover:text-[#9CA8B3]'}`}
            >
              <List className="w-3 h-3" />
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`font-['Rajdhani'] text-[12px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-md border-none cursor-pointer flex items-center gap-1.5 transition-all ${viewMode === 'calendar' ? 'bg-[#53CADC]/12 text-[#53CADC]' : 'bg-transparent text-[#5A6872] hover:text-[#9CA8B3]'}`}
            >
              <CalendarDays className="w-3 h-3" />
              Calendar
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <>
            {unifiedLoading ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="bg-[#111B24] rounded-[14px] p-4 animate-pulse border border-white/[0.06]">
                    <div className="flex items-center gap-4">
                      <div className="w-28 h-3 rounded bg-white/5" />
                      <div className="flex gap-2"><div className="w-6 h-6 rounded-full bg-white/5" /><div className="w-6 h-6 rounded-full bg-white/5" /><div className="w-6 h-6 rounded-full bg-white/5" /></div>
                      <div className="ml-auto w-16 h-4 rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : unifiedSessions.length === 0 ? (
              <div className="bg-[#111B24] rounded-xl p-8 text-center border border-white/[0.06]">
                <p className="text-[#5A6872] font-['Inter'] text-sm">No sessions yet. Complete a training session to see your history here.</p>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="font-['Rajdhani'] text-[12px] font-semibold uppercase tracking-[1.8px] text-[#53CADC]">Session History</span>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#5A6872]">Showing {unifiedSessions.length} of {unifiedTotalCount}</span>
                </div>
                {unifiedSessions.map((session, idx) => (
                  <UnifiedSessionCard key={session.id} session={session} defaultOpen={idx === 0} />
                ))}
              </>
            )}
          </>
        ) : (
          <SessionCalendarView sessions={unifiedSessions} />
        )}
      </section>

      {/* Section 3 — Patterns Placeholder */}
      <section className="mb-8">
        <PatternsPlaceholder totalCheckins={0} loading={loading} />
      </section>

      {/* Section 4 — Quick Tips */}
      <section className="mb-8">
        <QuickTipCard />
      </section>
    </div>
  );
}
