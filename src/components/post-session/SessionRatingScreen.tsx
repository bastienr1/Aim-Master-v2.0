import { useState, useEffect } from 'react';
import { useDebriefData } from '@/hooks/useDebriefData';
import { SESSION_QUALITY_LABELS } from '@/constants/debrief-config';
import type { DebriefInsight } from '@/types/debrief';

interface SessionRatingScreenProps {
  debriefCount: number;
  onComplete: (quality: number) => void;
}

export function SessionRatingScreen({ debriefCount, onComplete }: SessionRatingScreenProps) {
  const { getInsight } = useDebriefData();
  const [quality, setQuality] = useState<number | null>(null);
  const [insight, setInsight] = useState<DebriefInsight | null>(null);

  useEffect(() => {
    getInsight(debriefCount).then(setInsight);
  }, [debriefCount, getInsight]);

  const canComplete = quality !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <p className="text-[11px] font-['Inter'] text-[#5A6872] uppercase tracking-wider text-center">
        How would you rate this session?
      </p>

      {/* Quality circles */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3, 4, 5].map((val) => {
          const isSelected = quality === val;
          return (
            <button
              key={val}
              onClick={() => setQuality(val)}
              className="flex flex-col items-center gap-2 transition-all duration-150"
              style={{ cursor: 'pointer' }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-['JetBrains_Mono'] text-sm font-semibold transition-all duration-150"
                style={{
                  backgroundColor: isSelected
                    ? 'rgba(83, 202, 220, 0.2)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: isSelected
                    ? '1.5px solid #53CADC'
                    : '1.5px solid rgba(255, 255, 255, 0.1)',
                  color: isSelected ? '#53CADC' : '#5A6872',
                  boxShadow: isSelected
                    ? '0 0 12px rgba(83, 202, 220, 0.3)'
                    : 'none',
                  transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                {val}
              </div>
              {/* Show labels under 1, 3, and 5 */}
              <span
                className="text-[10px] font-['Inter']"
                style={{
                  color: isSelected ? '#53CADC' : '#5A6872',
                  opacity: val === 1 || val === 3 || val === 5 || isSelected ? 1 : 0,
                }}
              >
                {SESSION_QUALITY_LABELS[val]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Insight card */}
      {insight && (
        <div
          className="rounded-lg p-4 border-l-2"
          style={{
            backgroundColor: 'rgba(28, 43, 54, 0.6)',
            borderLeftColor: '#53CADC',
          }}
        >
          <p className="font-['Inter'] text-xs text-[#9CA8B3] leading-relaxed">
            {insight.message}
          </p>
        </div>
      )}

      {/* Complete button */}
      <button
        onClick={() => canComplete && onComplete(quality!)}
        disabled={!canComplete}
        className="w-full rounded-lg py-3 text-sm font-semibold font-['Inter'] text-white transition-all duration-200"
        style={{
          backgroundColor: '#FF4655',
          opacity: canComplete ? 1 : 0.4,
          cursor: canComplete ? 'pointer' : 'not-allowed',
        }}
        onMouseEnter={(e) => {
          if (canComplete) e.currentTarget.style.filter = 'brightness(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        Complete {'\u{2713}'}
      </button>
    </div>
  );
}
