import { useCallback, useRef, useState } from 'react';
import type { SliderConfig } from '@/constants/checkin-config';

interface CheckinSliderProps {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
  config: SliderConfig;
}

export function CheckinSlider({ label, value, onChange, config }: CheckinSliderProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [hapticLevel, setHapticLevel] = useState<number | null>(null);
  const selectedLabel = value !== null ? config.labels[value - 1] : '';

  const triggerHaptic = useCallback((level: number) => {
    setHapticLevel(level);
    setTimeout(() => setHapticLevel(null), 100);
  }, []);

  const handleSelect = useCallback(
    (level: number) => {
      onChange(level);
      triggerHaptic(level);
    },
    [onChange, triggerHaptic]
  );

  const handleRowClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!rowRef.current) return;
      const rect = rowRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const ratio = Math.max(0, Math.min(1, x / width));
      const nearest = Math.round(ratio * 4) + 1;
      handleSelect(nearest);
    },
    [handleSelect]
  );

  return (
    <div className="select-none">
      <p className="text-sm text-[#9CA8B3] font-['Inter'] mb-3">{label}</p>

      <div className="flex items-center gap-3">
        <div
          className="shrink-0 text-[#5A6872] opacity-60 w-5 h-5"
          dangerouslySetInnerHTML={{ __html: config.iconLeft }}
        />

        <div
          ref={rowRef}
          className="flex-1 flex items-center justify-between cursor-pointer py-2"
          onClick={handleRowClick}
        >
          {[1, 2, 3, 4, 5].map((level) => {
            const isSelected = value === level;
            const isHaptic = hapticLevel === level;
            return (
              <button
                key={level}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(level);
                }}
                className="checkin-tap-target relative flex items-center justify-center rounded-full border"
                style={{
                  width: 40,
                  height: 40,
                  borderColor: isSelected
                    ? config.color
                    : 'rgba(255,255,255,0.15)',
                  backgroundColor: isSelected
                    ? `${config.color}CC`
                    : 'transparent',
                  boxShadow: isSelected
                    ? `0 0 12px ${config.color}40, 0 0 4px ${config.color}20`
                    : 'none',
                  transform: isHaptic ? 'scale(1.15)' : 'scale(1)',
                  transition: isHaptic
                    ? 'transform 100ms ease'
                    : 'transform 100ms ease, border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease',
                }}
                aria-label={`${config.label} level ${level}${config.labels[level - 1] ? `: ${config.labels[level - 1]}` : ''}`}
              >
                {isSelected && (
                  <span
                    className="text-xs font-semibold font-['JetBrains_Mono']"
                    style={{ color: '#0F1923' }}
                  >
                    {level}
                  </span>
                )}
                {!isSelected && (
                  <span className="text-[10px] font-['JetBrains_Mono'] text-[#5A6872]">
                    {level}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          className="shrink-0 text-[#5A6872] opacity-60 w-5 h-5"
          dangerouslySetInnerHTML={{ __html: config.iconRight }}
        />
      </div>

      <div className="h-5 mt-1.5 flex justify-center">
        {selectedLabel && (
          <span
            className="text-xs font-['Inter'] font-medium transition-all duration-150"
            style={{ color: config.color }}
          >
            {selectedLabel}
          </span>
        )}
      </div>
    </div>
  );
}
