import { Crosshair, ArrowRight } from 'lucide-react';
import { SURFACE, TEXT, RADIUS, FONT, RED } from '@/constants/theme';

interface StartTrainingBarProps {
  onStartTraining: () => void;
  /** Optional banner art. Ships without it; a gradient keeps the text legible when set. */
  backgroundImage?: string;
}

export function StartTrainingBar({ onStartTraining, backgroundImage }: StartTrainingBarProps) {
  return (
    <button
      onClick={onStartTraining}
      className="w-full group"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '18px 22px',
        borderRadius: RADIUS.card,
        border: `1px solid ${RED}`,
        background: backgroundImage
          ? `linear-gradient(90deg, ${SURFACE.card} 35%, rgba(19,19,22,0.5) 70%, rgba(19,19,22,0.2)), url(${backgroundImage}) right center / cover no-repeat`
          : `linear-gradient(90deg, rgba(255,42,42,0.08), ${SURFACE.card} 60%)`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'filter 150ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)';
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <Crosshair size={20} style={{ color: RED, flexShrink: 0 }} />
        <span
          style={{
            fontFamily: FONT.heading,
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: RED,
            whiteSpace: 'nowrap',
          }}
        >
          START TRAINING
        </span>
        <ArrowRight size={18} style={{ color: RED, flexShrink: 0 }} />
      </span>

      <span
        className="hidden sm:inline"
        style={{
          fontFamily: FONT.mono,
          fontSize: '11px',
          color: TEXT.label,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        Training today, better tomorrow.
      </span>
    </button>
  );
}
