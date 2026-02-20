import { Lock, BarChart3 } from 'lucide-react';

interface PatternsPlaceholderProps {
  totalCheckins: number;
  loading: boolean;
}

export function PatternsPlaceholder({ totalCheckins, loading }: PatternsPlaceholderProps) {
  if (loading) {
    return (
      <div className="bg-[#2A3A47] border border-white/5 rounded-xl p-6 animate-pulse">
        <div className="w-40 h-5 rounded bg-white/5 mb-2" />
        <div className="w-64 h-3 rounded bg-white/5" />
        <div className="mt-6 h-32 rounded bg-white/5" />
      </div>
    );
  }

  const hasEnough = totalCheckins >= 5;

  return (
    <div className="bg-[#2A3A47] border border-white/5 rounded-xl p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-4 h-4 text-[#53CADC]" />
        <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
          Performance Patterns
        </h3>
      </div>
      <p className="text-[13px] font-['Inter'] text-[#5A6872] mb-6">
        {hasEnough
          ? 'Insights coming soon — we\'re analyzing your data'
          : `Complete ${5 - totalCheckins} more check-in${5 - totalCheckins === 1 ? '' : 's'} to unlock insights`}
      </p>

      {/* Mock chart area */}
      <div className="relative h-36 rounded-lg bg-[#1C2B36] border border-white/5 overflow-hidden">
        {/* Fake chart bars */}
        <div className="absolute inset-0 flex items-end justify-around px-4 pb-4 gap-2">
          {[40, 65, 50, 80, 35, 70, 55].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${h}%`,
                backgroundColor: 'rgba(83, 202, 220, 0.08)',
                border: '1px solid rgba(83, 202, 220, 0.06)',
              }}
            />
          ))}
        </div>

        {/* Fake grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between py-3 pointer-events-none">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="w-full h-px bg-white/[0.03]" />
          ))}
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-[#1C2B36]/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
          {hasEnough ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#53CADC] animate-pulse" />
              <span className="text-xs font-['Inter'] text-[#53CADC] font-medium">
                Analyzing your data…
              </span>
            </div>
          ) : (
            <>
              <Lock className="w-5 h-5 text-[#5A6872]" />
              <span className="text-xs font-['Inter'] text-[#5A6872]">
                Locked — need {5 - totalCheckins} more check-in{5 - totalCheckins === 1 ? '' : 's'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
