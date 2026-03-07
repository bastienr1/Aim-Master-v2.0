import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Goal, GoalProgressEntry } from '@/types/goals';

export interface UseGoalsReturn {
  activeGoals: Goal[];
  primaryGoal: Goal | null;
  completedGoals: Goal[];
  isLoading: boolean;
  createGoal: (goal: Partial<Goal>) => Promise<Goal | null>;
  updateGoal: (goalId: string, updates: Partial<Goal>) => Promise<void>;
  updateProgress: (goalId: string, delta: number, source: GoalProgressEntry['source'], note?: string, debriefId?: string) => Promise<void>;
  completeGoal: (goalId: string) => Promise<void>;
  pauseGoal: (goalId: string) => Promise<void>;
  abandonGoal: (goalId: string) => Promise<void>;
  reactivateGoal: (goalId: string) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  getProgressHistory: (goalId: string) => Promise<GoalProgressEntry[]>;
  refreshGoals: () => Promise<void>;
}

export function useGoals(): UseGoalsReturn {
  const { user } = useAuth();
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const primaryGoal = activeGoals.find((g) => g.priority === 1) || activeGoals[0] || null;

  const loadGoals = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [activeRes, completedRes] = await Promise.all([
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('priority', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (activeRes.error) console.error('Load active goals error:', activeRes.error);
      if (completedRes.error) console.error('Load completed goals error:', completedRes.error);

      setActiveGoals((activeRes.data as Goal[]) || []);
      setCompletedGoals((completedRes.data as Goal[]) || []);
    } catch (err) {
      console.error('loadGoals error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const createGoal = useCallback(async (goal: Partial<Goal>): Promise<Goal | null> => {
    if (!user) return null;
    try {
      // If setting priority 1, demote existing priority-1 goals
      if (goal.priority === 1) {
        await supabase
          .from('goals')
          .update({ priority: 2 })
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('priority', 1);
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          title: goal.title,
          description: goal.description || null,
          goal_type: goal.goal_type || 'process',
          category: goal.category || null,
          target_value: goal.target_value || 0,
          current_value: goal.current_value || 0,
          unit: goal.unit || '',
          deadline: goal.deadline || null,
          status: 'active',
          priority: goal.priority || 2,
          linked_scenarios: goal.linked_scenarios || [],
          created_from: goal.created_from || 'manual',
        })
        .select()
        .single();

      if (error) {
        console.error('Create goal error:', error);
        return null;
      }

      await loadGoals();
      return data as Goal;
    } catch (err) {
      console.error('createGoal error:', err);
      return null;
    }
  }, [user, loadGoals]);

  const updateGoal = useCallback(async (goalId: string, updates: Partial<Goal>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) console.error('Update goal error:', error);
      await loadGoals();
    } catch (err) {
      console.error('updateGoal error:', err);
    }
  }, [user, loadGoals]);

  const updateProgress = useCallback(async (
    goalId: string,
    delta: number,
    source: GoalProgressEntry['source'],
    note?: string,
    debriefId?: string,
  ) => {
    if (!user) return;
    try {
      // Get current goal value
      const { data: goal } = await supabase
        .from('goals')
        .select('current_value, target_value')
        .eq('id', goalId)
        .single();

      if (!goal) return;

      const newValue = (goal.current_value || 0) + delta;

      // Insert progress entry
      await supabase.from('goal_progress_entries').insert({
        goal_id: goalId,
        user_id: user.id,
        value_snapshot: newValue,
        delta,
        source,
        session_debrief_id: debriefId || null,
        note: note || null,
      });

      // Update goal current_value
      const updates: Record<string, unknown> = { current_value: newValue };

      // Auto-complete if target reached
      if (goal.target_value && newValue >= goal.target_value) {
        updates.status = 'completed';
      }

      await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .eq('user_id', user.id);

      await loadGoals();
    } catch (err) {
      console.error('updateProgress error:', err);
    }
  }, [user, loadGoals]);

  const setGoalStatus = useCallback(async (goalId: string, status: Goal['status']) => {
    if (!user) return;
    try {
      await supabase
        .from('goals')
        .update({ status })
        .eq('id', goalId)
        .eq('user_id', user.id);
      await loadGoals();
    } catch (err) {
      console.error('setGoalStatus error:', err);
    }
  }, [user, loadGoals]);

  const completeGoal = useCallback((goalId: string) => setGoalStatus(goalId, 'completed'), [setGoalStatus]);
  const pauseGoal = useCallback((goalId: string) => setGoalStatus(goalId, 'paused'), [setGoalStatus]);
  const abandonGoal = useCallback((goalId: string) => setGoalStatus(goalId, 'abandoned'), [setGoalStatus]);
  const reactivateGoal = useCallback((goalId: string) => setGoalStatus(goalId, 'active'), [setGoalStatus]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);
      await loadGoals();
    } catch (err) {
      console.error('deleteGoal error:', err);
    }
  }, [user, loadGoals]);

  const getProgressHistory = useCallback(async (goalId: string): Promise<GoalProgressEntry[]> => {
    if (!user) return [];
    try {
      const { data, error } = await supabase
        .from('goal_progress_entries')
        .select('*')
        .eq('goal_id', goalId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('getProgressHistory error:', error);
        return [];
      }
      return (data as GoalProgressEntry[]) || [];
    } catch (err) {
      console.error('getProgressHistory error:', err);
      return [];
    }
  }, [user]);

  return {
    activeGoals,
    primaryGoal,
    completedGoals,
    isLoading,
    createGoal,
    updateGoal,
    updateProgress,
    completeGoal,
    pauseGoal,
    abandonGoal,
    reactivateGoal,
    deleteGoal,
    getProgressHistory,
    refreshGoals: loadGoals,
  };
}
