import type { GoalType, GoalCategory } from '@/types/goals';

export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  goal_type: GoalType;
  category: GoalCategory | null;
  default_target: number;
  unit: string;
  default_deadline_days: number;
}

export const GOAL_TYPE_INFO: Record<GoalType, { label: string; description: string; color: string }> = {
  process: {
    label: 'Process Goal',
    description: 'Get better at something specific',
    color: '#53CADC',
  },
  habit: {
    label: 'Habit Goal',
    description: 'Build a training habit',
    color: '#3DD598',
  },
  outcome: {
    label: 'Outcome Goal',
    description: 'Hit a milestone',
    color: '#FFCA3A',
  },
};

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // Process templates
  {
    id: 'process-tracking',
    title: 'Improve tracking scores by {X}%',
    description: 'Focus on smooth, controlled mouse movements in tracking scenarios',
    goal_type: 'process',
    category: 'tracking',
    default_target: 15,
    unit: '%',
    default_deadline_days: 14,
  },
  {
    id: 'process-clicking',
    title: 'Improve clicking scores by {X}%',
    description: 'Sharpen your flick accuracy and target acquisition speed',
    goal_type: 'process',
    category: 'clicking',
    default_target: 10,
    unit: '%',
    default_deadline_days: 14,
  },
  {
    id: 'process-switching',
    title: 'Improve target switching scores by {X}%',
    description: 'Get faster and more accurate at switching between targets',
    goal_type: 'process',
    category: 'switching',
    default_target: 10,
    unit: '%',
    default_deadline_days: 14,
  },
  {
    id: 'process-scenario',
    title: 'Master a specific scenario — reach {X} score',
    description: 'Pick one scenario and grind it until you hit your target score',
    goal_type: 'process',
    category: null,
    default_target: 1000,
    unit: 'score',
    default_deadline_days: 21,
  },

  // Habit templates
  {
    id: 'habit-sessions',
    title: 'Train {X} times per week',
    description: 'Consistency beats intensity — show up regularly',
    goal_type: 'habit',
    category: 'consistency',
    default_target: 4,
    unit: 'sessions',
    default_deadline_days: 7,
  },
  {
    id: 'habit-checkin',
    title: 'Complete mental check-in before every session',
    description: 'Build the habit of checking your readiness before training',
    goal_type: 'habit',
    category: 'mental',
    default_target: 5,
    unit: 'check-ins',
    default_deadline_days: 7,
  },
  {
    id: 'habit-notes',
    title: 'Write scenario notes for {X} training blocks',
    description: 'Active reflection accelerates learning',
    goal_type: 'habit',
    category: 'mental',
    default_target: 5,
    unit: 'blocks',
    default_deadline_days: 7,
  },

  // Outcome templates
  {
    id: 'outcome-rank',
    title: 'Reach {X} rank in Voltaic',
    description: 'Hit a specific Voltaic benchmark rank',
    goal_type: 'outcome',
    category: null,
    default_target: 1,
    unit: 'rank',
    default_deadline_days: 28,
  },
  {
    id: 'outcome-pr',
    title: 'Hit PR on a specific scenario',
    description: 'Beat your personal best on a scenario you care about',
    goal_type: 'outcome',
    category: null,
    default_target: 1,
    unit: 'PR',
    default_deadline_days: 14,
  },
];

export const CATEGORY_OPTIONS: { value: GoalCategory; label: string }[] = [
  { value: 'tracking', label: 'Tracking' },
  { value: 'clicking', label: 'Clicking' },
  { value: 'switching', label: 'Switching' },
  { value: 'mental', label: 'Mental Game' },
  { value: 'consistency', label: 'Consistency' },
  { value: 'custom', label: 'Custom' },
];
