import { THEME_KIND_COLOR } from './debrief-config';

// ─── Dashboard v4 design tokens ───
// One job per colour. A colour that does not come from data is decoration:
// when a `kind` is null, render neutral rather than inventing a hue.

/** Identity + action only. Never a metric, delta, score or theme chip. */
export const RED = '#FF2A2A';
/** Positive change. Never a button, brand or decoration. */
export const GREEN = '#3DD598';
/** Weakness / mechanics to work on. Not an error or alarm. */
export const AMBER = '#FFCA3A';
/** Mental game / mindset. Never anything mechanical or score-related. */
export const CYAN = '#53CADC';

export const TEXT = {
  /** Primary information — headings, debrief text, scenario names. */
  primary: '#E8E6E1',
  /** Secondary body copy — notes, tags, timestamps. */
  body: '#B9B6AF',
  /** Section labels, inactive nav. */
  label: '#8E8B85',
  /** Dimmest structural text. Never something the user must notice. */
  dim: '#6B6862',
} as const;

export const SURFACE = {
  page: '#0A0A0B',
  sidebar: '#0D0D0F',
  card: '#131316',
  inset: '#18181B',
  insetBorder: '#232327',
  chip: '#1F1F23',
  iconBox: '#1C1C20',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

export const RADIUS = {
  card: '6px',
  input: '6px',
  chip: '999px',
} as const;

/** Loaded in index.html. */
export const FONT = {
  heading: "'Rajdhani', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

// ─── Semantic roles (Dashboard v5) ───

/**
 * Roles by meaning rather than hue. The three kind colours are re-exported from
 * THEME_KIND_COLOR, never re-declared — a second copy of those hexes is exactly
 * the drift the v4 system was built to avoid.
 */
export const SEMANTIC = {
  positive: THEME_KIND_COLOR.positive,
  mechanics: THEME_KIND_COLOR.mechanics,
  mindset: THEME_KIND_COLOR.mindset,
  action: RED,
} as const;

/**
 * Shared style for the centred band/section headings.
 * textIndent offsets the trailing letter-space so the caps sit optically centred.
 */
export const SECTION_TITLE = {
  fontFamily: FONT.mono,
  fontWeight: 700,
  fontSize: 15,
  letterSpacing: '0.2em',
  textIndent: '0.2em',
  textAlign: 'center',
} as const;
