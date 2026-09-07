import { SECTION_TITLE, TEXT, FONT } from '@/constants/theme';

interface SectionTitleProps {
  /** The section name, rendered uppercase. */
  label: string;
  /** Optional muted detail on the same line — wraps under on narrow widths. */
  sub?: string;
  /** Defaults to primary text; sections use their own hue (LOGBOOK cyan, PLAYBOOK amber). */
  color?: string;
}

/**
 * Centred mono caps heading used by the Context cards and the Active Mission card.
 * The colour carries the section's identity, so it always comes from the caller.
 */
export function SectionTitle({ label, sub, color = TEXT.primary }: SectionTitleProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <span style={{ ...SECTION_TITLE, color, textTransform: 'uppercase' }}>{label}</span>
      {sub && (
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: TEXT.label,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}
