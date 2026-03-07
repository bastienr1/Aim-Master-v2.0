export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  goal_type: 'process' | 'outcome' | 'habit';
  category?: string | null;
  target_value: number;
  current_value: number;
  unit: string;
  deadline?: string | null;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  priority: 1 | 2 | 3;
  linked_scenarios: string[];
  created_from: string;
  created_at: string;
}

export interface GoalProgressEntry {
  id: string;
  goal_id: string;
  user_id: string;
  created_at: string;
  value_snapshot: number;
  delta: number | null;
  source: 'auto_sync' | 'manual' | 'debrief';
  session_debrief_id?: string | null;
  note?: string | null;
}

export type GoalType = Goal['goal_type'];
export type GoalCategory = 'tracking' | 'clicking' | 'switching' | 'mental' | 'consistency' | 'custom';
export type GoalStatus = Goal['status'];
