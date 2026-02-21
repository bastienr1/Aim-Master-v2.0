import type { GroupedSession } from '@/types/debrief';
import { ScoreSparkline } from './ScoreSparkline';

interface SessionSummaryScreenProps {
  session: GroupedSession;
  onNext: () => void;
}

export function SessionSummaryScreen({ session, onNext }: SessionSummaryScreenProps) {
  const durationMin = Math.round(session.durationSeconds / 60);

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-2">
          <span className="text-sm">{'\u{23F1}\u{FE0F}'}</span>
          <span className="font-['JetBrains_Mono'] text-sm text-[#ECE8E1]">
            {durationMin} min
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-2">
          <span className="text-sm">{'\u{1F3AF}'}</span>
          <span className="font-['JetBrains_Mono'] text-sm text-[#ECE8E1]">
            {session.scenarioCount} scenario{session.scenarioCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(session.categories).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(session.categories).map(([cat, count]) => (
            <span
              key={cat}
              className="bg-white/5 text-[#9CA8B3] rounded-full px-3 py-1 text-xs font-['Inter'] capitalize"
            >
              {cat} {count}
            </span>
          ))}
        </div>
      )}

      {/* Score sparkline */}
      {session.scoreTrajectory.length >= 2 && (
        <div>
          <p className="text-[11px] font-['Inter'] text-[#5A6872] mb-2 uppercase tracking-wider">
            Score Trend
          </p>
          <div className="bg-white/[0.03] rounded-lg p-3">
            <ScoreSparkline data={session.scoreTrajectory} width={380} height={48} />
          </div>
        </div>
      )}

      {/* PR celebrations */}
      {session.prsDetected.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-['Inter'] text-[#5A6872] uppercase tracking-wider">
            Personal Records
          </p>
          {session.prsDetected.map((pr) => (
            <div
              key={pr.scenarioName}
              className="rounded-lg p-3"
              style={{
                borderLeft: '2px solid #3DD598',
                backgroundColor: 'rgba(61, 213, 152, 0.05)',
                animation: 'prPulse 2s ease-in-out infinite',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-['Inter'] text-sm text-[#ECE8E1]">
                  {'\u{1F3C6}'} {pr.scenarioName}
                </span>
                <span className="font-['JetBrains_Mono'] text-xs text-[#3DD598]">
                  +{pr.improvementPct.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-['JetBrains_Mono'] text-xs text-[#5A6872]">
                  {Math.round(pr.previousBest)}
                </span>
                <span className="text-[#5A6872] text-xs">{'\u{2192}'}</span>
                <span className="font-['JetBrains_Mono'] text-xs text-[#3DD598] font-semibold">
                  {Math.round(pr.newScore)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score decline note */}
      {session.scoresDeclined && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2">
          <span className="text-xs">{'\u{1F4C9}'}</span>
          <span className="font-['Inter'] text-xs text-amber-400/80">
            Scores tapered toward the end
          </span>
        </div>
      )}

      {/* Next button */}
      <button
        onClick={onNext}
        className="w-full rounded-lg py-3 text-sm font-semibold font-['Inter'] text-white transition-all duration-200"
        style={{
          backgroundColor: '#FF4655',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        Next {'\u{2192}'}
      </button>

      {/* PR pulse animation */}
      <style>{`
        @keyframes prPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(61, 213, 152, 0); }
          50% { box-shadow: 0 0 12px 0 rgba(61, 213, 152, 0.15); }
        }
      `}</style>
    </div>
  );
}
