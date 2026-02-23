import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Trophy, Flame, Target } from 'lucide-react';
import type { PRStreakData } from '@/types/debrief';

interface PRStreakTrackerProps {
  prData: PRStreakData;
}

export function PRStreakTracker({ prData }: PRStreakTrackerProps) {
  // ─── Loading skeleton (matches CheckinStreakCard) ───
  if (prData.isLoading) {
    return (
      <div className="bg-[#2A3A47] border border-white/5 rounded-xl p-4 animate-pulse">
        <div className="w-40 h-4 rounded bg-white/5 mb-2" />
        <div className="w-64 h-3 rounded bg-white/5" />
      </div>
    );
  }

  // ─── State 3: New user / no data — hide completely ───
  if (prData.isEmpty) return null;

  // ─── State 2: No PRs this week (encouragement mode) ───
  if (prData.totalPRs === 0) {
    return (
      <div className="bg-[#2A3A47] border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#9CA8B3]/10 flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-[#9CA8B3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-['Inter'] text-[#ECE8E1] font-medium">
              No new records this week — yet
            </p>
            <p className="text-xs font-['Inter'] text-[#5A6872] mt-0.5">
              PRs come in waves. Keep training consistently and the breakthrough will come.
            </p>
          </div>
        </div>
        <PRDots prDaysInWindow={prData.prDaysInWindow} />
      </div>
    );
  }

  // ─── State 1: Has PRs (celebration mode) ───
  const hasRecentPR = prData.prs.some(
    pr => new Date(pr.achievedAt).toISOString().split('T')[0] ===
          new Date().toISOString().split('T')[0]
  );

  // Top 4 by improvement %, keeping first-plays at the end
  const topPRs = useMemo(() => {
    return [...prData.prs]
      .sort((a, b) => b.improvement - a.improvement)
      .slice(0, 4);
  }, [prData.prs]);

  // Group PRs into pages of 2 for mobile swipe
  const pages = useMemo(() => {
    const result: typeof topPRs[] = [];
    for (let i = 0; i < topPRs.length; i += 2) {
      result.push(topPRs.slice(i, i + 2));
    }
    return result;
  }, [topPRs]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [activePage, setActivePage] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const page = Math.round(el.scrollLeft / el.clientWidth);
    setActivePage(page);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <>
      <style>{`
        @keyframes prGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(61, 213, 152, 0.3); }
          50% { box-shadow: 0 0 20px rgba(61, 213, 152, 0.6); }
        }
        .pr-swipe-container::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        className="bg-[#2A3A47] border border-[#3DD598]/20 rounded-xl p-4"
        style={hasRecentPR ? { animation: 'prGlow 2s ease-in-out 3' } : undefined}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#3DD598]/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-[#3DD598]" />
            </div>
            <span className="font-['Rajdhani'] text-base font-semibold text-[#ECE8E1] uppercase tracking-wide">
              PR Streak
            </span>
          </div>
          {prData.streakDays >= 2 && (
            <span className="flex items-center gap-1 text-xs font-['Inter'] text-[#FF4655] font-semibold">
              {prData.streakDays}-day
              <Flame className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {/* Mobile: horizontal swipeable pages of 2 cards */}
        <div
          ref={scrollRef}
          className="sm:hidden flex overflow-x-auto snap-x snap-mandatory mb-1 pr-swipe-container"
          style={{ scrollbarWidth: 'none' }}
        >
          {pages.map((page, pageIdx) => (
            <div key={pageIdx} className="flex gap-2 min-w-full snap-center">
              {page.map((pr, i) => (
                <PRCard key={`${pr.scenarioName}-${pageIdx}-${i}`} pr={pr} />
              ))}
            </div>
          ))}
        </div>

        {/* Mobile: page dot indicators */}
        {pages.length > 1 && (
          <div className="sm:hidden flex justify-center gap-1.5 mb-2 mt-2">
            {pages.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === activePage ? 'bg-[#3DD598]' : 'bg-[#5A6872]/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Desktop: 2x2 grid */}
        <div className="hidden sm:grid grid-cols-2 gap-2 mb-3">
          {topPRs.map((pr, i) => (
            <PRCard key={`${pr.scenarioName}-${i}`} pr={pr} />
          ))}
        </div>

        {/* 7-day dot visualization */}
        <PRDots prDaysInWindow={prData.prDaysInWindow} />

        {/* Summary line */}
        <p className="text-xs font-['Inter'] text-[#5A6872] mt-3">
          {prData.totalPRs} PR{prData.totalPRs !== 1 ? 's' : ''} this week
          {prData.bestImprovement && !prData.bestImprovement.isFirstPlay && (
            <>
              {' \u{00B7} '}Best:{' '}
              <span className="text-[#3DD598] font-['JetBrains_Mono']">
                +{prData.bestImprovement.improvement.toFixed(1)}%
              </span>
              {' '}on {prData.bestImprovement.scenarioName}
            </>
          )}
        </p>
      </div>
    </>
  );
}

// ─── 7-Day Dot Visualization ───

function PRDots({ prDaysInWindow }: { prDaysInWindow: Set<string> }) {
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });
      const hasPR = prDaysInWindow.has(dateStr);
      const isToday = i === 0;

      result.push({ dateStr, dayName, hasPR, isToday });
    }
    return result;
  }, [prDaysInWindow]);

  return (
    <div className="flex gap-3 justify-center mt-3">
      {days.map(day => (
        <div key={day.dateStr} className="flex flex-col items-center gap-1">
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              day.hasPR
                ? 'bg-[#3DD598] shadow-sm shadow-[#3DD598]/40'
                : day.isToday
                ? 'bg-[#2A3A47] border border-[#53CADC]'
                : 'bg-[#1C2B36]'
            }`}
          />
          <span className="text-[10px] text-[#5A6872] font-['Inter'] leading-none">
            {day.dayName}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── PR Card (shared between mobile swipe and desktop grid) ───

function PRCard({ pr }: { pr: { scenarioName: string; improvement: number; isFirstPlay: boolean; previousBest: number; newScore: number } }) {
  return (
    <div
      className="rounded-lg px-2.5 py-2 flex-1 min-w-0"
      style={{
        borderLeft: '2px solid #3DD598',
        backgroundColor: 'rgba(61, 213, 152, 0.05)',
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-['Inter'] text-xs text-[#ECE8E1] truncate min-w-0">
          {pr.scenarioName}
        </span>
        {!pr.isFirstPlay && (
          <span className="font-['JetBrains_Mono'] text-[11px] text-[#3DD598] shrink-0">
            +{pr.improvement.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        {pr.isFirstPlay ? (
          <span className="font-['Inter'] text-[11px] text-[#3DD598]">
            First score!
          </span>
        ) : (
          <>
            <span className="font-['JetBrains_Mono'] text-[11px] text-[#5A6872]">
              {Math.round(pr.previousBest).toLocaleString()}
            </span>
            <span className="text-[#5A6872] text-[11px]">{'\u{2192}'}</span>
            <span className="font-['JetBrains_Mono'] text-[11px] text-[#3DD598] font-semibold">
              {Math.round(pr.newScore).toLocaleString()}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
