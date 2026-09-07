export interface GroupedSession {
  sessionStart: string;
  sessionEnd: string;
  durationSeconds: number;
  plays: SessionPlay[];
  scenarioCount: number;
  categories: Record<string, number>;
  prsDetected: PRDetection[];
  scoreTrajectory: number[];
  scoresDeclined: boolean;
  hasNewScenario: boolean;
}

export interface SessionPlay {
  scenarioName: string;
  score: number;
  timestamp: string;
  leaderboardId?: string;
  aimType?: string;
  isNewScenario?: boolean;
}

export interface PRDetection {
  scenarioName: string;
  newScore: number;
  previousBest: number;
  improvementPct: number;
}

export interface ScenarioNoteSnapshot {
  scenario_name: string;
  notes_text: string;
  completed_at: string | null;
  /** How the player classified the note. Null renders a neutral tick. */
  note_kind: 'mechanics' | 'mindset' | 'positive' | null;
}

export interface SessionDebrief {
  primaryTheme: string | null;
  secondaryTheme: string | null;
  freeformText: string | null;
  emojiReaction: string | null;
  sessionQuality: number | null;
  /** "Carry into today" — optional, captured on the rating screen (Phase 2). */
  nextIntent: string | null;
  scenarioNotes?: ScenarioNoteSnapshot[];
}

export interface DebriefInsight {
  message: string;
  type: 'correlation' | 'pattern' | 'motivational';
}

// ─── PR Streak Tracker types ───

export interface PersonalRecord {
  scenarioName: string;
  newScore: number;
  previousBest: number;
  improvement: number;        // percentage gain: ((new - old) / old) * 100
  category: string | null;
  achievedAt: string;         // ISO timestamp (from debrief created_at)
  isFirstPlay: boolean;       // true if no previous best existed
}

export interface PRStreakData {
  prs: PersonalRecord[];       // all PRs in window, sorted by achievedAt DESC
  totalPRs: number;
  streakDays: number;          // consecutive days with at least 1 PR
  bestImprovement: PersonalRecord | null;
  prDaysInWindow: Set<string>; // set of date strings (YYYY-MM-DD) with PRs
  isLoading: boolean;
  isEmpty: boolean;            // true if no debriefs exist at all (new user)
}

// ─── Vault tips (synced from Obsidian by scripts/sync-vault.mjs) ───

export interface VaultTip {
  id: string;
  user_id: string;
  /** Vault-relative path, e.g. "Aim Training/Techniques/Flick deceleration.md" */
  source_path: string;
  title: string;
  body: string;
  drill: string | null;
  /** Debrief theme ids this tip answers. */
  themes: string[];
  tags: string[];
  kind: 'mechanics' | 'mindset' | null;
  updated_at: string;
}
