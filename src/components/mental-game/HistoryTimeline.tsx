import type { CheckinRow } from '@/hooks/useCheckinData';
import { INTENT_OPTIONS } from '@/constants/checkin-config';

interface HistoryTimelineProps {
  checkins: CheckinRow[];
  loading: boolean;
}

const MAX_ANIMATED_ROWS = 10;

function SkeletonRow() {
  return (
    <div className="bg-[#1C2B36] rounded-lg p-4 mb-2 animate-pulse border-l-4 border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="w-28 h-3 rounded bg-white/5" />
        <div className="flex gap-4">
          <div className="w-16 h-3 rounded bg-white/5" />
          <div className="w-16 h-3 rounded bg-white/5" />
          <div className="w-16 h-3 rounded bg-white/5" />
        </div>
        <div className="w-20 h-5 rounded-full bg-white/5 ml-auto" />
      </div>
    </div>
  );
}

function getLevelColor(level: number): string {
  if (level <= 2) return '#FF4655';
  if (level === 3) return '#FFCA3A';
  return '#3DD598';
}

function getLevelDot(level: number) {
  const color = getLevelColor(level);
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1.5 flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

function getBorderColor(row: CheckinRow): string {
  if (row.skipped) return '#5A6872';
  const levels = [row.energy_level, row.focus_level, row.mood_level].filter(
    (v): v is number => v !== null
  );
  if (levels.length === 0) return '#5A6872';
  const avg = levels.reduce((a, b) => a + b, 0) / levels.length;
  if (avg >= 4) return '#3DD598';
  if (avg >= 2.5) return '#FFCA3A';
  return '#FF4655';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }) +
    ', ' +
    d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  );
}

function getIntentLabel(intent: string | null): string {
  if (!intent) return '';
  const found = INTENT_OPTIONS.find((o) => o.id === intent);
  return found ? found.label : intent;
}

export function HistoryTimeline({ checkins, loading }: HistoryTimelineProps) {
  if (loading) {
    return (
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div className="bg-[#1C2B36] rounded-xl p-8 text-center">
        <p className="text-[#5A6872] font-['Inter'] text-sm">
          No check-ins yet. Complete your first pre-training check-in to see your history here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {checkins.map((row, idx) => {
        const shouldAnimate = idx < MAX_ANIMATED_ROWS;

        return (
          <div
            key={row.id}
            className={`bg-[#1C2B36] rounded-lg p-4 mb-2 border-l-4 transition-colors duration-200 hover:bg-[#1C2B36]/80 ${
              shouldAnimate ? 'history-row-animate' : ''
            }`}
            style={{
              borderLeftColor: getBorderColor(row),
              ...(shouldAnimate
                ? { animationDelay: `${idx * 50}ms` }
                : { opacity: 1 }),
            }}
          >
            {row.skipped ? (
              <div className="flex items-center justify-between">
                <span className="text-xs font-['Inter'] text-[#5A6872]">
                  {formatDate(row.created_at)}
                </span>
                <span className="text-xs font-['Inter'] text-[#5A6872] italic">Skipped</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-xs font-['Inter'] text-[#5A6872] whitespace-nowrap min-w-[120px]">
                  {formatDate(row.created_at)}
                </span>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {row.energy_level !== null && (
                    <span className="flex items-center text-xs font-['Inter'] text-[#9CA8B3]">
                      {getLevelDot(row.energy_level)}
                      Energy:{' '}
                      <span
                        className="font-['JetBrains_Mono'] ml-1"
                        style={{ color: getLevelColor(row.energy_level) }}
                      >
                        {row.energy_level}
                      </span>
                    </span>
                  )}
                  {row.focus_level !== null && (
                    <span className="flex items-center text-xs font-['Inter'] text-[#9CA8B3]">
                      {getLevelDot(row.focus_level)}
                      Focus:{' '}
                      <span
                        className="font-['JetBrains_Mono'] ml-1"
                        style={{ color: getLevelColor(row.focus_level) }}
                      >
                        {row.focus_level}
                      </span>
                    </span>
                  )}
                  {row.mood_level !== null && (
                    <span className="flex items-center text-xs font-['Inter'] text-[#9CA8B3]">
                      {getLevelDot(row.mood_level)}
                      Mood:{' '}
                      <span
                        className="font-['JetBrains_Mono'] ml-1"
                        style={{ color: getLevelColor(row.mood_level) }}
                      >
                        {row.mood_level}
                      </span>
                    </span>
                  )}
                </div>

                {row.session_intent && (
                  <span className="ml-auto px-2.5 py-1 rounded-full text-[10px] font-semibold font-['Inter'] uppercase tracking-wider bg-[#53CADC]/10 text-[#53CADC] whitespace-nowrap">
                    {getIntentLabel(row.session_intent)}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
