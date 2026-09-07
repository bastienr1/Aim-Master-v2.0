import type { ReactNode } from 'react';
import { TEXT, FONT, SURFACE } from '@/constants/theme';

interface BandLabelProps {
  /** TODAY / SIGNALS / CONTEXT. */
  children: ReactNode;
}

/**
 * Dim mono label followed by a hairline that fills the rest of the row.
 * Separates the three bands without adding another boxed surface.
 */
export function BandLabel({ children }: BandLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginTop: '4px',
        marginBottom: '10px',
      }}
    >
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: TEXT.dim,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </span>
      <span
        aria-hidden
        style={{ flex: 1, height: '1px', background: SURFACE.cardBorder }}
      />
    </div>
  );
}
