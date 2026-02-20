// ─── Pre-Training Check-in Configuration ───
// All labels, colors, and inline SVG icons for the mental check-in system.
// No external icon libraries — everything is self-contained.

export interface SliderConfig {
  label: string;
  labels: string[];
  color: string;
  iconLeft: string;
  iconRight: string;
}

export interface IntentOption {
  id: string;
  label: string;
  description: string;
  icon: string;
}

// ─── ENERGY (Blue) ───
export const ENERGY_CONFIG: SliderConfig = {
  label: 'Energy Level',
  labels: ['Drained', '', 'Moderate', '', 'Wired'],
  color: '#53CADC',
  iconLeft: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="11" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <rect x="14" y="8.5" width="2" height="3" rx="0.5" fill="currentColor"/>
    <line x1="6" y1="8.5" x2="6" y2="11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,
  iconRight: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="6" width="11" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
    <rect x="14" y="8.5" width="2" height="3" rx="0.5" fill="currentColor"/>
    <rect x="5" y="8" width="2" height="4" rx="0.5" fill="currentColor"/>
    <rect x="8" y="8" width="2" height="4" rx="0.5" fill="currentColor"/>
    <rect x="11" y="8" width="1.5" height="4" rx="0.5" fill="currentColor"/>
  </svg>`,
};

// ─── FOCUS (Red) ───
export const FOCUS_CONFIG: SliderConfig = {
  label: 'Focus Level',
  labels: ['Scattered', '', 'Neutral', '', 'Locked In'],
  color: '#FF4655',
  iconLeft: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="5" cy="7" r="1.5" fill="currentColor"/>
    <circle cx="14" cy="5" r="1.5" fill="currentColor"/>
    <circle cx="10" cy="14" r="1.5" fill="currentColor"/>
    <circle cx="16" cy="13" r="1" fill="currentColor"/>
    <circle cx="4" cy="15" r="1" fill="currentColor"/>
  </svg>`,
  iconRight: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5"/>
    <circle cx="10" cy="10" r="1" fill="currentColor"/>
  </svg>`,
};

// ─── MOOD (Yellow) ───
export const MOOD_CONFIG: SliderConfig = {
  label: 'Mood (optional)',
  labels: ['Tilted', '', 'Neutral', '', 'Confident'],
  color: '#FFCA3A',
  iconLeft: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 8C4 8 6 6 10 6C14 6 16 8 16 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M3 12L5 11M17 12L15 11M8 13L10 12L12 13" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="7" y1="4" x2="8" y2="5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="13" y1="4" x2="12" y2="5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
  iconRight: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1.5"/>
    <line x1="6" y1="4" x2="5" y2="2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="14" y1="4" x2="15" y2="2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="16" y1="6" x2="18" y2="5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="4" y1="6" x2="2" y2="5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="10" y1="3" x2="10" y2="1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
};

// ─── SESSION INTENT ───
export const INTENT_OPTIONS: IntentOption[] = [
  {
    id: 'warmup',
    label: 'Warm-up',
    description: 'Preparing for ranked',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 9 7 9 10C9 11.5 9.8 12.8 11 13.5V20H13V13.5C14.2 12.8 15 11.5 15 10C15 7 12 2 12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 20H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M10 22H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: 'improve',
    label: 'Improve',
    description: 'Grind weak areas',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
      <line x1="12" y1="1" x2="12" y2="5" stroke="currentColor" stroke-width="1.5"/>
      <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="1.5"/>
      <line x1="1" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="1.5"/>
      <line x1="19" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="1.5"/>
    </svg>`,
  },
  {
    id: 'push_pr',
    label: 'Push PRs',
    description: 'Peak performance',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 9H4V20H6V9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M6 4L12 2L18 4V9C18 9 18 14 12 17C6 14 6 9 6 9V4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M12 7V12M12 12L9.5 10M12 12L14.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
  },
  {
    id: 'maintenance',
    label: 'Maintain',
    description: 'Stay sharp',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L14.5 8.5L20.5 9.3L16.2 13.4L17.3 19.3L12 16.5L6.7 19.3L7.8 13.4L3.5 9.3L9.5 8.5L12 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,
  },
];

// ─── GENERIC FALLBACK MESSAGES ───
export const GENERIC_COACHING_MESSAGES: string[] = [
  'Every session counts. Stay present, focus on the process, and the scores will follow.',
  'Consistency beats intensity. Show up, put in the reps, and trust the grind.',
  'Remember: aim training is a skill. Approach each scenario with intention, not autopilot.',
  'Your brain needs warm-up time too. Give yourself the first few minutes to settle in.',
  'Progress isn\'t always linear. Bad days are part of the process — keep showing up.',
];
