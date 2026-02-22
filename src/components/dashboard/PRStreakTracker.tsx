import { useMemo } from 'react';
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
  const latestPR = prData.prs[0];
  const isToday = latestPR
    ? new Date(latestPR.achievedAt).toISOString().split('T')[0] ===
      new Date().toISOString().split('T')[0]
    : false;

  return (
    <>
      <style>{`
        @keyframes prGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(61, 213, 152, 0.3); }
          50% { box-shadow: 0 0 20px rgba(61, 213, 152, 0.6); }
        }
      `}</style>
      <div
        className="bg-[#2A3A47] border border-[#3DD598]/20 rounded-xl p-4"
        style={isToday ? { animation: 'prGlow 2s ease-in-out 3' } : undefined}
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

        {/* Latest PR card */}
        {latestPR && (
          <div
            className="rounded-lg p-3 mb-3"
            style={{
              borderLeft: '2px solid #3DD598',
              backgroundColor: 'rgba(61, 213, 152, 0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] text-sm text-[#ECE8E1]">
                {latestPR.isFirstPlay ? '\u{1F195} ' : '\u{1F3AF} '}
                {latestPR.scenarioName}
              </span>
              {!latestPR.isFirstPlay && (
                <span className="font-['JetBrains_Mono'] text-xs text-[#3DD598]">
                  +{latestPR.improvement.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {latestPR.isFirstPlay ? (
                <span className="font-['Inter'] text-xs text-[#3DD598]">
                  First score!
                </span>
              ) : (
                <>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#5A6872]">
                    {Math.round(latestPR.previousBest).toLocaleString()}
                  </span>
                  <span className="text-[#5A6872] text-xs">{'\u{2192}'}</span>
                  <span className="font-['JetBrains_Mono'] text-xs text-[#3DD598] font-semibold">
                    {Math.round(latestPR.newScore).toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

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
