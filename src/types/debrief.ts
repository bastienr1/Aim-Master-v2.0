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

export interface SessionDebrief {
  primaryTheme: string | null;
  secondaryTheme: string | null;
  freeformText: string | null;
  emojiReaction: string | null;
  sessionQuality: number | null;
}

export interface DebriefInsight {
  message: string;
  type: 'correlation' | 'pattern' | 'motivational';
}
