import { Flame, TrendingUp } from 'lucide-react';
import type { CheckinStreakData } from '@/hooks/useCheckinStreak';

interface CheckinStreakCardProps {
  streak: CheckinStreakData;
}

export function CheckinStreakCard({ streak }: CheckinStreakCardProps) {
  if (streak.loading) {
    return (
      <div className="bg-[#2A3A47] border border-white/5 rounded-xl p-4 animate-pulse">
        <div className="w-40 h-4 rounded bg-white/5 mb-2" />
        <div className="w-64 h-3 rounded bg-white/5" />
      </div>
    );
  }

  if (streak.totalCheckins === 0) return null;

  return (
    <div className="bg-[#2A3A47] border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#FF4655]/10 flex items-center justify-center flex-shrink-0">
          {streak.isConsistent ? (
            <Flame className="w-4 h-4 text-[#FF4655]" />
          ) : (
            <TrendingUp className="w-4 h-4 text-[#53CADC]" />
          )}
        </div>
        <div>
          <p className="text-sm font-['Inter'] text-[#ECE8E1] font-medium">
            {streak.isConsistent
              ? `${streak.last7DaysCount} check-ins this week — you're building consistency!`
              : `${streak.totalCheckins} total check-in${streak.totalCheckins === 1 ? '' : 's'} — keep it going!`}
          </p>
          <p className="text-xs font-['Inter'] text-[#5A6872] mt-0.5">
            {streak.isConsistent
              ? 'Consistent players see 2x faster improvement'
              : `${3 - streak.last7DaysCount} more this week to build a streak`}
          </p>
        </div>
      </div>
    </div>
  );
}
