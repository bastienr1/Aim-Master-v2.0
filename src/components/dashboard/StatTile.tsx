import type { ReactNode } from 'react';
import { SURFACE, TEXT, RADIUS, FONT } from '@/constants/theme';

interface StatTileProps {
  /** Mono uppercase key, dim. */
  label: string;
  /** The number or figure. Mono, tabular, with an optional trend span. */
  value: ReactNode;
  /** Sparkline, day-dots, sentence or button — pinned to the bottom so tiles align. */
  foot?: ReactNode;
  /** Spans both columns on phone, where the grid is 2-up. */
  wide?: boolean;
}

/**
 * One signal, rendered to a fixed contract so a row of tiles shares baselines:
 * label at the top, value beneath it, foot pinned to the bottom edge.
 */
export function StatTile({ label, value, foot, wide }: StatTileProps) {
  return (
    <div
      className={wide ? 'col-span-2 sm:col-span-1' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100px',
        padding: '12px 14px',
        background: SURFACE.card,
        border: `1px solid ${SURFACE.cardBorder}`,
        borderRadius: RADIUS.card,
      }}
    >
      <span
        style={{
          fontFamily: FONT.mono,
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: TEXT.dim,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '7px',
          flexWrap: 'wrap',
          marginTop: '6px',
        }}
      >
        {value}
      </div>

      {/* margin-top:auto is what keeps every tile's foot on one baseline */}
      {foot && <div style={{ marginTop: 'auto', paddingTop: '10px' }}>{foot}</div>}
    </div>
  );
}

/** The large figure inside a tile. `small` is for word values like "2 days ago". */
export function TileValue({
  children,
  color,
  small,
}: {
  children: ReactNode;
  color?: string;
  small?: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: FONT.mono,
        fontSize: small ? '16px' : '21px',
        fontWeight: 700,
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
        color: color ?? TEXT.primary,
      }}
    >
      {children}
    </span>
  );
}

/** The muted qualifier that trails a value ("↗ improving", "days", "not yet"). */
export function TileTrend({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontFamily: FONT.mono,
        fontSize: '11px',
        fontWeight: 600,
        color: color ?? TEXT.label,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}
