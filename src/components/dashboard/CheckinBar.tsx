import { Sparkles } from 'lucide-react';
import { TEXT, FONT, SEMANTIC } from '@/constants/theme';

interface CheckinBarProps {
  streakDays: number;
  onClick(): void;
}

/**
 * The mental-game action, paired with Start Training at the foot of Home.
 * Cyan because it belongs to the mental game; the red action below it is the
 * page's only primary.
 */
export function CheckinBar({ streakDays, onClick }: CheckinBarProps) {
  return (
    <button
      onClick={onClick}
      className="w-full"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        minHeight: '48px',
        padding: '10px 16px',
        borderRadius: '8px',
        background: `${SEMANTIC.mindset}1F`,
        border: `1px solid ${SEMANTIC.mindset}59`,
        cursor: 'pointer',
        transition: 'filter 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)';
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          fontFamily: FONT.mono,
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: SEMANTIC.mindset,
        }}
      >
        <Sparkles size={13} /> Check-in
      </span>
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: '10.5px',
          color: TEXT.label,
          textAlign: 'center',
        }}
      >
        {streakDays}-day streak · pre-training check-ins are the #1 predictor of improvement
      </span>
    </button>
  );
}
