import { Crosshair, ArrowRight } from 'lucide-react';
import { SURFACE, TEXT, FONT, RED } from '@/constants/theme';

interface StartTrainingBarProps {
  onStartTraining: () => void;
  /** Optional banner art. Ships without it; a gradient keeps the text legible when set. */
  backgroundImage?: string;
}

/**
 * The page's single primary action, paired under CheckinBar.
 * Sticky on phone so it stays reachable above the tab bar; static on desktop.
 */
export function StartTrainingBar({ onStartTraining, backgroundImage }: StartTrainingBarProps) {
  return (
    <button
      onClick={onStartTraining}
      className="w-full sticky sm:static z-10"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        minHeight: '52px',
        padding: '12px 18px',
        borderRadius: '8px',
        border: `1px solid ${RED}`,
        background: backgroundImage
          ? `linear-gradient(180deg, ${SURFACE.card} 35%, rgba(19,19,22,0.65)), url(${backgroundImage}) center / cover no-repeat`
          : `linear-gradient(180deg, rgba(255,42,42,0.10), ${SURFACE.card} 75%)`,
        cursor: 'pointer',
        // -6px so the two bars read as one pair rather than two stacked cards
        marginTop: '-6px',
        bottom: 'calc(64px + env(safe-area-inset-bottom))',
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
          gap: '10px',
          fontFamily: FONT.mono,
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: RED,
        }}
      >
        <Crosshair size={15} /> Start training <ArrowRight size={15} />
      </span>
      <span style={{ fontFamily: FONT.mono, fontSize: '10.5px', color: TEXT.label, textAlign: 'center' }}>
        Training today, better tomorrow.
      </span>
    </button>
  );
}
