// ─── Post-Session Debrief Configuration ───
// All static config for the debrief system. Mirrors checkin-config.ts pattern.

// ─── Theme Chip Definitions ───

export interface ThemeChipConfig {
  id: string;
  label: string;
  emoji: string;
  placeholder: string;
  contextual: boolean;
  triggerCondition?: string;
}

export const CORE_THEME_CHIPS: ThemeChipConfig[] = [
  {
    id: 'focus_dropped',
    label: 'Focus Dropped',
    emoji: '\u{1F3AF}',
    placeholder: 'When did you notice? What were you doing?',
    contextual: false,
  },
  {
    id: 'tension_grip',
    label: 'Tension / Grip',
    emoji: '\u{1F4AA}',
    placeholder: 'Where in your hand? During which scenarios?',
    contextual: false,
  },
  {
    id: 'consistency',
    label: "Couldn't Stabilize",
    emoji: '\u{1F504}',
    placeholder: 'Were scores up and down, or declining steadily?',
    contextual: false,
  },
  {
    id: 'overthinking',
    label: 'Overthinking',
    emoji: '\u{1F9E0}',
    placeholder: 'Were you analyzing instead of reacting?',
    contextual: false,
  },
  {
    id: 'fatigue',
    label: 'Fatigue',
    emoji: '\u{26A1}',
    placeholder: 'Physical fatigue, mental fatigue, or both?',
    contextual: false,
  },
  {
    id: 'technique_question',
    label: 'Technique Question',
    emoji: '\u{1F3AE}',
    placeholder: 'What movement or mechanic felt uncertain?',
    contextual: false,
  },
  {
    id: 'felt_good',
    label: 'Felt Good',
    emoji: '\u{1F525}',
    placeholder: 'What do you want to repeat next time?',
    contextual: false,
  },
  {
    id: 'something_else',
    label: 'Something Else',
    emoji: '\u{2753}',
    placeholder: 'I am looking for a solution to...',
    contextual: false,
  },
];

export const CONTEXTUAL_THEME_CHIPS: ThemeChipConfig[] = [
  {
    id: 'new_pr',
    label: 'New PR',
    emoji: '\u{1F3C6}',
    placeholder: 'What felt different about that run?',
    contextual: true,
    triggerCondition: 'prs_detected',
  },
  {
    id: 'new_scenario',
    label: 'New Scenario',
    emoji: '\u{1F195}',
    placeholder: 'First impressions?',
    contextual: true,
    triggerCondition: 'has_new_scenario',
  },
  {
    id: 'cut_short',
    label: 'Cut It Short',
    emoji: '\u{23F1}\u{FE0F}',
    placeholder: 'What made you stop early?',
    contextual: true,
    triggerCondition: 'short_session',
  },
  {
    id: 'went_downhill',
    label: 'Went Downhill',
    emoji: '\u{1F4C9}',
    placeholder: 'Did you notice when it started dropping?',
    contextual: true,
    triggerCondition: 'scores_declined',
  },
];

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

export const DEBRIEF_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours
export const SESSION_GAP_THRESHOLD_MS = 10 * 60 * 1000; // 10 min gap = new session
export const SHORT_SESSION_THRESHOLD_S = 600; // < 10 min = short session
export const SCORE_DECLINE_THRESHOLD = 0.15; // 15% decline triggers contextual chip
export const INSIGHT_MIN_DEBRIEFS = 10; // need 10+ debriefs to show insights
