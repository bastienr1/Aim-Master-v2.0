import { INTENT_OPTIONS } from '@/constants/checkin-config';

interface IntentSelectorProps {
  value: string | null;
  onChange: (val: string) => void;
  hasKovaaks: boolean;
}

const LOCKED_INTENTS = ['push_pr', 'maintenance'];

export function IntentSelector({ value, onChange, hasKovaaks }: IntentSelectorProps) {
  return (
    <div className="select-none">
      <p className="text-sm text-[#9CA8B3] font-['Inter'] mb-3">Session Intent</p>

      <div className="grid grid-cols-2 gap-3">
        {INTENT_OPTIONS.map((option) => {
          const isSelected = value === option.id;
          const isLocked = !hasKovaaks && LOCKED_INTENTS.includes(option.id);

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                if (!isLocked) onChange(option.id);
              }}
              className="relative flex flex-col items-center text-center rounded-xl p-4 border transition-all duration-200 ease-in-out cursor-pointer group"
              style={{
                backgroundColor: '#1C2B36',
                borderColor: isLocked
                  ? 'rgba(255,255,255,0.05)'
                  : isSelected
                  ? 'rgba(255, 70, 85, 0.6)'
                  : 'rgba(255,255,255,0.1)',
                boxShadow: isSelected && !isLocked
                  ? '0 0 16px rgba(255, 70, 85, 0.12), 0 0 4px rgba(255, 70, 85, 0.08)'
                  : 'none',
                opacity: isLocked ? 0.4 : 1,
                pointerEvents: isLocked ? 'none' : 'auto',
                transitionProperty: 'opacity, border-color, box-shadow',
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isLocked) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isLocked) {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }
              }}
              aria-pressed={isSelected}
              aria-disabled={isLocked}
              aria-label={`${option.label}: ${option.description}${isLocked ? ' (locked — connect KovaaK\'s to unlock)' : ''}`}
            >
              {/* Icon */}
              <div
                className="w-6 h-6 mb-2 transition-colors duration-200"
                style={{ color: isSelected && !isLocked ? '#FF4655' : '#9CA8B3' }}
                dangerouslySetInnerHTML={{ __html: option.icon }}
              />

              {/* Label + lock icon */}
              <span
                className="text-sm font-semibold font-['Inter'] transition-colors duration-200 inline-flex items-center gap-1"
                style={{ color: '#ECE8E1' }}
              >
                {option.label}
                {isLocked && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5A6872"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
              </span>

              {/* Description */}
              <span className="text-[11px] font-['Inter'] text-[#9CA8B3] mt-0.5">
                {option.description}
              </span>

              {/* Unlock hint */}
              {isLocked && (
                <span className="text-[10px] font-['Inter'] text-[#5A6872] mt-1">
                  Connect KovaaK's to unlock
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
