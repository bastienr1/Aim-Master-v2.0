import { ClipboardCheck, Flame, Gauge } from 'lucide-react';

interface SummaryCardsProps {
  totalCheckins: number;
  streak: number;
  avgReadiness: number | null;
  loading: boolean;
}

function SkeletonCard() {
  return (
    <div className="bg-[#2A3A47] border border-white/5 rounded-xl p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/5" />
        <div className="w-16 h-4 rounded bg-white/5" />
      </div>
      <div className="w-20 h-8 rounded bg-white/5 mb-2" />
      <div className="w-28 h-3 rounded bg-white/5" />
    </div>
  );
}

function getReadinessColor(avg: number): string {
  if (avg > 3.5) return '#3DD598';
  if (avg >= 2.5) return '#9CA8B3';
  return '#FFCA3A';
}

export function SummaryCards({ totalCheckins, streak, avgReadiness, loading }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const readinessDisplay = avgReadiness !== null ? avgReadiness.toFixed(1) : '—';
  const readinessColor = avgReadiness !== null ? getReadinessColor(avgReadiness) : '#5A6872';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Check-ins */}
      <div
        className="stat-card-animate bg-[#2A3A47] border border-white/5 rounded-xl p-6"
        style={{ animationDelay: '0ms' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#53CADC]/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-[#53CADC]" />
          </div>
        </div>
        <p className="font-['JetBrains_Mono'] text-[32px] font-bold text-[#ECE8E1] leading-none">
          {totalCheckins}
        </p>
        <p className="text-xs font-['Inter'] text-[#5A6872] mt-1.5">sessions logged</p>
      </div>

      {/* Current Streak */}
      <div
        className="stat-card-animate bg-[#2A3A47] border border-white/5 rounded-xl p-6 relative overflow-hidden"
        style={{
          animationDelay: '100ms',
          ...(streak >= 7
            ? {
                boxShadow:
                  '0 0 20px rgba(255, 70, 85, 0.15), inset 0 0 20px rgba(255, 70, 85, 0.05)',
              }
            : undefined),
        }}
      >
        {streak >= 7 && (
          <div
            className="absolute inset-0 rounded-xl animate-pulse pointer-events-none"
            style={{
              border: '1px solid rgba(255, 70, 85, 0.25)',
            }}
          />
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#FF4655]/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#FF4655]" />
          </div>
          {streak >= 7 && (
            <span className="text-[10px] font-['Inter'] font-semibold text-[#FF4655] uppercase tracking-wider">
              🔥 On Fire
            </span>
          )}
        </div>
        <p className="font-['JetBrains_Mono'] text-[32px] font-bold text-[#ECE8E1] leading-none">
          {streak}
        </p>
        <p className="text-xs font-['Inter'] text-[#5A6872] mt-1.5">day streak</p>
      </div>

      {/* Avg Readiness */}
      <div
        className="stat-card-animate bg-[#2A3A47] border border-white/5 rounded-xl p-6"
        style={{ animationDelay: '200ms' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-[#3DD598]/10 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-[#3DD598]" />
          </div>
        </div>
        <p
          className="font-['JetBrains_Mono'] text-[32px] font-bold leading-none"
          style={{ color: readinessColor }}
        >
          {readinessDisplay}
          <span className="text-base font-normal text-[#5A6872] ml-1">/ 5.0</span>
        </p>
        <p className="text-xs font-['Inter'] text-[#5A6872] mt-1.5">readiness score</p>
      </div>
    </div>
  );
}
