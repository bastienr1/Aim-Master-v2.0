import { Target, ArrowRight } from 'lucide-react';
import type { GoalStrategy } from '@/hooks/useGoalStrategy';
import type { Goal } from '@/types/goals';

const RANK_COLORS: Record<string, string> = {
  Iron: '#7C7C7C',
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#4ECDC4',
  Diamond: '#53CADC',
  Jade: '#3DD598',
  Master: '#FF2A2A',
};

interface GoalRoadmapProps {
  goal: Goal | null;
  strategy: GoalStrategy;
  onNavigate: (tab: string) => void;
}

export function GoalRoadmap({ goal, strategy, onNavigate }: GoalRoadmapProps) {
  // No goal state
  if (!goal) {
    return (
      <div
        className="bg-[#131316] border border-white/[0.08] rounded-md p-5 cursor-pointer hover:border-[#53CADC]/30 transition-colors"
        onClick={() => onNavigate('goals')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-[#8E8B85]" />
            <div>
              <p className="text-[#E8E6E1] text-sm font-['Rajdhani'] font-semibold">
                Set a Goal
              </p>
              <p className="text-[#8E8B85] text-xs font-['Inter']">
                Unlock your personalized roadmap and daily coaching
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8E8B85]" />
        </div>
      </div>
    );
  }

  // Calculate days remaining
  const daysLeft = goal.deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <div
      className="rounded-md p-5"
      style={{
        background: 'linear-gradient(135deg, #141C24 0%, #1A2A35 100%)',
        border: '1px solid rgba(255,70,85,0.12)',
        boxShadow: '0 0 40px rgba(255,70,85,0.03)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#FF2A2A]" />
          <span className="text-[10px] font-['Inter'] uppercase tracking-wider text-[#8E8B85]">
            Active Mission
          </span>
        </div>
        {daysLeft !== null && (
          <span className="text-[11px] font-['JetBrains_Mono'] text-[#8E8B85]">
            {daysLeft}d left
          </span>
        )}
      </div>

      {/* Goal title */}
      <h3 className="text-[#E8E6E1] font-['Rajdhani'] font-bold text-2xl mb-3">
        {goal.title}
      </h3>

      {/* Subcategory gates */}
      {strategy.gates.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {strategy.gates.slice(0, 3).map((gate) => (
            <div
              key={gate.name}
              className="bg-[#18181B] rounded-md px-3 py-2 flex items-center gap-2"
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: RANK_COLORS[gate.rank] || '#8E8B85' }}
              />
              <div>
                <span className="text-[#E8E6E1] text-xs font-['Inter'] font-medium">
                  {gate.name}
                </span>
                <span className="text-[#8E8B85] text-[10px] font-['JetBrains_Mono'] ml-1.5">
                  {gate.percentile}%
                </span>
                <span
                  className="text-[10px] font-['JetBrains_Mono'] ml-1 font-bold px-1.5 py-0.5 rounded"
                  style={{
                    color: RANK_COLORS[gate.rank] || '#8E8B85',
                    backgroundColor: `${RANK_COLORS[gate.rank] || '#8E8B85'}18`,
                  }}
                >
                  {gate.rank}
                </span>
              </div>
            </div>
          ))}
          {strategy.gates.length > 3 && (
            <div className="bg-[#18181B] rounded-md px-3 py-2 flex items-center">
              <span className="text-[#8E8B85] text-[10px] font-['Inter']">
                +{strategy.gates.length - 3} more
              </span>
            </div>
          )}
        </div>
      ) : strategy.hasGoal ? (
        <div className="flex items-center gap-2 mb-3 bg-[#3DD598]/10 rounded-md px-3 py-2">
          <span className="text-[#3DD598] text-xs font-['Inter']">
            All subcategories meet your target
          </span>
        </div>
      ) : null}

      {/* Strategic insight */}
      <p className="text-[#B9B6AF] text-[13px] font-['Inter'] leading-relaxed">
        {strategy.strategicInsight}
      </p>
    </div>
  );
}
