// ─── Post-Session Debrief Configuration ───
// All static config for the debrief system. Mirrors checkin-config.ts pattern.

// ─── Theme Chip Definitions ───

/**
 * What a theme says about the session. Drives chip / tick colour everywhere a
 * theme surfaces, and is the fallback matcher for vault tips (see useVaultTip).
 * `neutral` means "no signal" — render grey, never invent a colour.
 */
export type ThemeKind = 'mechanics' | 'mindset' | 'positive' | 'neutral';

export const THEME_KIND_COLOR: Record<ThemeKind, string> = {
  mechanics: '#FFCA3A',
  mindset: '#53CADC',
  positive: '#3DD598',
  neutral: '#B9B6AF',
};

export interface ThemeChipConfig {
  id: string;
  label: string;
  emoji: string;
  placeholder: string;
  contextual: boolean;
  kind: ThemeKind;
  triggerCondition?: string;
}

export const CORE_THEME_CHIPS: ThemeChipConfig[] = [
  {
    id: 'focus_dropped',
    label: 'Focus Dropped',
    emoji: '\u{1F3AF}',
    placeholder: 'When did you notice? What were you doing?',
    contextual: false,
    kind: 'mindset',
  },
  {
    id: 'tension_grip',
    label: 'Tension / Grip',
    emoji: '\u{1F4AA}',
    placeholder: 'Where in your hand? During which scenarios?',
    contextual: false,
    kind: 'mechanics',
  },
  {
    id: 'consistency',
    label: "Couldn't Stabilize",
    emoji: '\u{1F504}',
    placeholder: 'Were scores up and down, or declining steadily?',
    contextual: false,
    kind: 'mechanics',
  },
  {
    id: 'overthinking',
    label: 'Overthinking',
    emoji: '\u{1F9E0}',
    placeholder: 'Were you analyzing instead of reacting?',
    contextual: false,
    kind: 'mindset',
  },
  {
    id: 'fatigue',
    label: 'Fatigue',
    emoji: '\u{26A1}',
    placeholder: 'Physical fatigue, mental fatigue, or both?',
    contextual: false,
    kind: 'mindset',
  },
  {
    id: 'technique_question',
    label: 'Technique Question',
    emoji: '\u{1F3AE}',
    placeholder: 'What movement or mechanic felt uncertain?',
    contextual: false,
    kind: 'mechanics',
  },
  {
    id: 'felt_good',
    label: 'Felt Good',
    emoji: '\u{1F525}',
    placeholder: 'What do you want to repeat next time?',
    contextual: false,
    kind: 'positive',
  },
  {
    id: 'something_else',
    label: 'Something Else',
    emoji: '\u{2753}',
    placeholder: 'I am looking for a solution to...',
    contextual: false,
    kind: 'neutral',
  },
];

export const CONTEXTUAL_THEME_CHIPS: ThemeChipConfig[] = [
  {
    id: 'new_pr',
    label: 'New PR',
    emoji: '\u{1F3C6}',
    placeholder: 'What felt different about that run?',
    contextual: true,
    kind: 'positive',
    triggerCondition: 'prs_detected',
  },
  {
    id: 'new_scenario',
    label: 'New Scenario',
    emoji: '\u{1F195}',
    placeholder: 'First impressions?',
    contextual: true,
    kind: 'neutral',
    triggerCondition: 'has_new_scenario',
  },
  {
    id: 'cut_short',
    label: 'Cut It Short',
    emoji: '\u{23F1}\u{FE0F}',
    placeholder: 'What made you stop early?',
    contextual: true,
    kind: 'mindset',
    triggerCondition: 'short_session',
  },
  {
    id: 'went_downhill',
    label: 'Went Downhill',
    emoji: '\u{1F4C9}',
    placeholder: 'Did you notice when it started dropping?',
    contextual: true,
    kind: 'mechanics',
    triggerCondition: 'scores_declined',
  },
];

/** Look up a theme chip by id across both core and contextual sets. */
export function getThemeConfig(id: string | null | undefined): ThemeChipConfig | null {
  if (!id) return null;
  return (
    CORE_THEME_CHIPS.find((c) => c.id === id) ??
    CONTEXTUAL_THEME_CHIPS.find((c) => c.id === id) ??
    null
  );
}

/** Colour for a theme id — neutral grey when the theme is unknown or unset. */
export function getThemeKindColor(id: string | null | undefined): string {
  return THEME_KIND_COLOR[getThemeConfig(id)?.kind ?? 'neutral'];
}

// ─── Emoji Reactions ───

export interface EmojiReactionConfig {
  id: string;
  emoji: string;
  label: string;
}

export const EMOJI_REACTIONS: EmojiReactionConfig[] = [
  { id: 'frustrated', emoji: '\u{1F624}', label: 'Frustrated' },
  { id: 'neutral', emoji: '\u{1F610}', label: 'Neutral' },
  { id: 'decent', emoji: '\u{1F642}', label: 'Decent' },
  { id: 'fired_up', emoji: '\u{1F525}', label: 'Fired Up' },
  { id: 'calm_focused', emoji: '\u{1F9CA}', label: 'Calm' },
];

// ─── Session Quality Labels ───

export const SESSION_QUALITY_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Avg',
  3: 'Average',
  4: 'Good',
  5: 'Great',
};

// ─── Motivational Tips (shown when < 10 debriefs) ───

export const DEBRIEF_MOTIVATIONAL_TIPS: string[] = [
  'Consistent logging builds self-awareness. That\'s the foundation of improvement.',
  'Every entry teaches AimMaster about your patterns.',
  'The best players don\'t just train — they reflect on what they trained.',
  'Your future self will thank you for documenting this.',
  'Reflection turns practice into deliberate practice.',
];

// ─── Cooldown ───

export const DEBRIEF_COOLDOWN_MS = 0; // TODO: restore to 2 * 60 * 60 * 1000 for production
export const SESSION_GAP_THRESHOLD_MS = 10 * 60 * 1000; // 10 min gap = new session
export const SHORT_SESSION_THRESHOLD_S = 600; // < 10 min = short session
export const SCORE_DECLINE_THRESHOLD = 0.15; // 15% decline triggers contextual chip
export const INSIGHT_MIN_DEBRIEFS = 10; // need 10+ debriefs to show insights
