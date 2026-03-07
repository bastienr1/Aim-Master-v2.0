import { useState } from 'react';
import { Target, Plus, CheckCircle2 } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalCreationModal } from '@/components/goals/GoalCreationModal';

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

  const [showCreateModal, setShowCreateModal] = useState(false);

  const supportingGoals = activeGoals.filter((g) => g !== primaryGoal);

  const handleSetPrimary = async (goalId: string) => {
    // Demote current primary, promote selected
    if (primaryGoal) {
      await updateGoal(primaryGoal.id, { priority: 2 });
    }
    await updateGoal(goalId, { priority: 1 });
  };

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
            onDelete={deleteGoal}
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
                onDelete={deleteGoal}
                onSetPrimary={handleSetPrimary}
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
        onCreate={async (goalData) => {
          await createGoal(goalData);
        }}
      />
    </div>
  );
}
