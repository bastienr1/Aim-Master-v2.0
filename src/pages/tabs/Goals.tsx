import { useState } from 'react';
import { toast } from 'sonner';
import { Target, Plus, CheckCircle2, X } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useSavedDrills } from '@/hooks/useSavedDrills';
import { usePlaybookIndex } from '@/hooks/usePlaybooks';
import { drillsForGoal, mergeScenarios } from '@/lib/savedDrills';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalCreationModal, type NewGoalInput } from '@/components/goals/GoalCreationModal';
import { DrillPicker } from '@/components/goals/DrillPicker';
import { PlaybookReader } from '@/components/playbook/PlaybookReader';
import type { Goal, GoalCategory } from '@/types/goals';
import type { SavedDrill } from '@/types/playbook';

interface ReaderTarget {
  open: boolean;
  playbookId: string | null;
  seconds: number | null;
  drillId: string | null;
}

export function Goals() {
  const {
    activeGoals,
    primaryGoal,
    completedGoals,
    isLoading,
    createGoal,
    completeGoal,
    pauseGoal,
    abandonGoal,
    reactivateGoal,
    deleteGoal,
    updateGoal,
  } = useGoals();

  // Saved drills and their goal links come from the shared store, so a drill
  // saved in the Home reader is pickable here without a reload.
  const { saved, links, linkDrills, unlinkDrill, forgetGoalLinks } = useSavedDrills();
  const { playbooks } = usePlaybookIndex();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addDrillsFor, setAddDrillsFor] = useState<Goal | null>(null);
  const [reader, setReader] = useState<ReaderTarget>({ open: false, playbookId: null, seconds: null, drillId: null });

  const supportingGoals = activeGoals.filter((g) => g !== primaryGoal);

  const handleSetPrimary = async (goalId: string) => {
    // Demote current primary, promote selected
    if (primaryGoal) {
      await updateGoal(primaryGoal.id, { priority: 2 });
    }
    await updateGoal(goalId, { priority: 1 });
  };

  // The database drops a deleted goal's links by cascade; the store has to follow.
  const handleDelete = async (goalId: string) => {
    await deleteGoal(goalId);
    forgetGoalLinks(goalId);
  };

  const handleCreate = async ({ drill_ids, ...goalData }: NewGoalInput) => {
    const picked = saved.filter((s) => drill_ids.includes(s.id));
    const goal = await createGoal({ ...goalData, linked_scenarios: mergeScenarios([], picked) });
    if (goal && drill_ids.length > 0) {
      const ok = await linkDrills(goal.id, drill_ids);
      if (!ok) toast.error('Goal created, but the drills were not attached. Add them from the goal card.');
    }
  };

  const handleAddDrills = async (goal: Goal, ids: string[]) => {
    if (ids.length === 0) return;
    const ok = await linkDrills(goal.id, ids);
    if (!ok) {
      toast.error('The drills were not attached. Try again from the goal card.');
      return;
    }
    const picked = saved.filter((s) => ids.includes(s.id));
    const existing = goal.linked_scenarios ?? [];
    const merged = mergeScenarios(existing, picked);
    if (merged.length !== existing.length) {
      await updateGoal(goal.id, { linked_scenarios: merged });
    }
  };

  const openDrill = (drill: SavedDrill) => {
    if (drill.playbook_id === null) return;
    setReader({ open: true, playbookId: drill.playbook_id, seconds: drill.source_start_seconds, drillId: drill.drill_id });
  };

  const drillProps = (goal: Goal) => ({
    drills: drillsForGoal(goal.id, links, saved),
    onOpenDrill: openDrill,
    onUnlinkDrill: (drill: SavedDrill) => unlinkDrill(goal.id, drill.id),
    onAddDrills: () => setAddDrillsFor(goal),
  });

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 animate-slide-up">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-[#2A3A47] rounded-xl" />
          <div className="h-5 w-96 bg-[#2A3A47] rounded-xl" />
          <div className="h-40 bg-[#2A3A47] rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-[#2A3A47] rounded-xl" />
            <div className="h-32 bg-[#2A3A47] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-['Rajdhani'] text-3xl font-bold text-[#ECE8E1] flex items-center gap-3">
            <Target className="w-7 h-7 text-[#FF4655]" />
            Your Mission
          </h1>
          <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">
            Process goals drive real improvement
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#FF4655] text-white px-4 py-2.5 rounded-xl font-semibold font-['Inter'] text-sm hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-[#FF4655]/20"
        >
          <Plus className="w-4 h-4" />
          Set New Goal
        </button>
      </div>

      {/* Empty state */}
      {activeGoals.length === 0 && completedGoals.length === 0 && (
        <div className="bg-[#1C2B36] border border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF4655]/10 flex items-center justify-center mx-auto mb-5">
            <Target className="w-8 h-8 text-[#FF4655]" />
          </div>
          <h2 className="font-['Rajdhani'] text-xl font-semibold text-[#ECE8E1] mb-2">
            Set Your First Goal
          </h2>
          <p className="text-[#9CA8B3] text-sm font-['Inter'] max-w-md mx-auto mb-6">
            Goals give your training purpose. Focus on process goals — "improve tracking by 15%" beats "hit Radiant" every time.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#FF4655] text-white px-6 py-3 rounded-xl font-semibold font-['Inter'] text-sm hover:brightness-110 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First Goal
          </button>
        </div>
      )}

      {/* Primary Goal */}
      {primaryGoal && (
        <div className="mb-6">
          <h3 className="font-['Rajdhani'] text-sm font-semibold text-[#5A6872] uppercase tracking-wider mb-3">
            Primary Goal
          </h3>
          <GoalCard
            goal={primaryGoal}
            isPrimary
            onComplete={completeGoal}
            onPause={pauseGoal}
            onAbandon={abandonGoal}
            onDelete={handleDelete}
            {...drillProps(primaryGoal)}
          />
        </div>
      )}

      {/* Supporting Goals */}
      {supportingGoals.length > 0 && (
        <div className="mb-6">
          <h3 className="font-['Rajdhani'] text-sm font-semibold text-[#5A6872] uppercase tracking-wider mb-3">
            Supporting Goals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supportingGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onComplete={completeGoal}
                onPause={pauseGoal}
                onAbandon={abandonGoal}
                onReactivate={reactivateGoal}
                onDelete={handleDelete}
                onSetPrimary={handleSetPrimary}
                {...drillProps(goal)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div>
          <h3 className="font-['Rajdhani'] text-sm font-semibold text-[#5A6872] uppercase tracking-wider mb-3">
            Completed
          </h3>
          <div className="space-y-2">
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="flex items-center gap-3 bg-[#0F1923] rounded-xl px-4 py-3 border border-white/5"
              >
                <CheckCircle2 className="w-5 h-5 text-[#3DD598] shrink-0" />
                <span className="text-sm font-['Inter'] text-[#3DD598] line-through flex-1">
                  {goal.title}
                </span>
                <span className="text-[11px] font-['JetBrains_Mono'] text-[#5A6872]">
                  {new Date(goal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add goal button (when goals exist) */}
      {activeGoals.length > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-[#9CA8B3] hover:text-[#ECE8E1] text-sm font-['Inter'] flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Another Goal
          </button>
        </div>
      )}

      {/* Creation Modal */}
      <GoalCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

      {/* Add drills to an existing goal */}
      {addDrillsFor && (
        <AddDrillsDialog
          goal={addDrillsFor}
          excludeIds={drillsForGoal(addDrillsFor.id, links, saved).map((d) => d.id)}
          onClose={() => setAddDrillsFor(null)}
          onConfirm={async (ids) => {
            const goal = addDrillsFor;
            setAddDrillsFor(null);
            await handleAddDrills(goal, ids);
          }}
        />
      )}

      {/* The reader a goal card's drill opens, at the drill's source moment */}
      <PlaybookReader
        open={reader.open}
        onOpenChange={(open) => setReader((r) => ({ ...r, open }))}
        playbooks={playbooks}
        initialPlaybookId={reader.playbookId}
        initialSeconds={reader.seconds}
        initialDrillId={reader.drillId}
      />
    </div>
  );
}

function AddDrillsDialog({
  goal,
  excludeIds,
  onClose,
  onConfirm,
}: {
  goal: Goal;
  excludeIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => Promise<void>;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (picked.length === 0 || busy) return;
    setBusy(true);
    await onConfirm(picked);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-[#0F1923] rounded-2xl p-6" style={{ maxHeight: 'calc(100vh - 32px)' }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="font-['Rajdhani'] text-xl font-semibold text-[#ECE8E1]">Add drills</h2>
            <p className="text-xs font-['Inter'] text-[#5A6872] mt-0.5 truncate">{goal.title}</p>
          </div>
          <button onClick={onClose} className="text-[#5A6872] hover:text-[#9CA8B3] transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <DrillPicker goalCategory={(goal.category as GoalCategory | null) ?? null} selected={picked} onChange={setPicked} excludeIds={excludeIds} />

        <button
          onClick={confirm}
          disabled={picked.length === 0 || busy}
          className="mt-5 w-full rounded-lg py-3 text-sm font-semibold font-['Inter'] text-white transition-all"
          style={{
            backgroundColor: '#FF4655',
            opacity: picked.length > 0 && !busy ? 1 : 0.4,
            cursor: picked.length > 0 && !busy ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? 'Adding…' : picked.length > 0 ? `Add ${picked.length} drill${picked.length === 1 ? '' : 's'}` : 'Add drills'}
        </button>
      </div>
    </div>
  );
}
