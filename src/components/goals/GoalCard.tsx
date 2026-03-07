import { useState } from 'react';
import { Target, Pause, Trash2, Play, MoreVertical, CheckCircle2 } from 'lucide-react';
import type { Goal } from '@/types/goals';
import { GOAL_TYPE_INFO } from '@/data/goalTemplates';

interface GoalCardProps {
  goal: Goal;
  isPrimary?: boolean;
  onComplete: (goalId: string) => void;
  onPause: (goalId: string) => void;
  onAbandon: (goalId: string) => void;
  onReactivate?: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onSetPrimary?: (goalId: string) => void;
}

export function GoalCard({
  goal,
  isPrimary = false,
  onComplete,
  onPause,
  onAbandon,
  onReactivate,
  onDelete,
  onSetPrimary,
}: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const typeInfo = GOAL_TYPE_INFO[goal.goal_type];

  const progress = goal.target_value > 0
    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
    : 0;

  const daysLeft = goal.deadline
    ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isAtRisk = daysLeft !== null && daysLeft <= 3 && progress < 80;
  const isBehind = daysLeft !== null && daysLeft <= 1 && progress < 50;

  const progressColor = isBehind
    ? '#FF4655'
    : isAtRisk
    ? '#FFCA3A'
    : '#3DD598';

  return (
    <div
      className={`rounded-xl p-5 transition-all ${
        isPrimary
          ? 'bg-[#1C2B36] border border-[#FF4655]/30'
          : 'bg-[#0F1923] border border-white/5'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPrimary && (
            <span className="text-[10px] font-['JetBrains_Mono'] text-[#FF4655] bg-[#FF4655]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Primary
            </span>
          )}
          <span
            className="text-[10px] font-['JetBrains_Mono'] px-2 py-0.5 rounded-full"
            style={{
              color: typeInfo.color,
              backgroundColor: `${typeInfo.color}15`,
            }}
          >
            {typeInfo.label}
          </span>
          {goal.category && (
            <span className="text-[10px] font-['JetBrains_Mono'] text-[#5A6872] bg-white/5 px-2 py-0.5 rounded-full capitalize">
              {goal.category}
            </span>
          )}
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-[#5A6872] hover:text-[#9CA8B3] transition-colors p-1"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-6 z-20 bg-[#2A3A47] border border-white/10 rounded-lg py-1 min-w-[160px] shadow-xl">
                {goal.status === 'active' && (
                  <>
                    {!isPrimary && onSetPrimary && (
                      <MenuButton onClick={() => { onSetPrimary(goal.id); setShowMenu(false); }}>
                        <Target className="w-3.5 h-3.5" /> Set as Primary
                      </MenuButton>
                    )}
                    <MenuButton onClick={() => { onComplete(goal.id); setShowMenu(false); }}>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#3DD598]" /> Mark Complete
                    </MenuButton>
                    <MenuButton onClick={() => { onPause(goal.id); setShowMenu(false); }}>
                      <Pause className="w-3.5 h-3.5 text-[#FFCA3A]" /> Pause
                    </MenuButton>
                    <MenuButton onClick={() => { onAbandon(goal.id); setShowMenu(false); }} danger>
                      <Trash2 className="w-3.5 h-3.5" /> Abandon
                    </MenuButton>
                  </>
                )}
                {(goal.status === 'paused' || goal.status === 'abandoned') && onReactivate && (
                  <MenuButton onClick={() => { onReactivate(goal.id); setShowMenu(false); }}>
                    <Play className="w-3.5 h-3.5 text-[#3DD598]" /> Reactivate
                  </MenuButton>
                )}
                <MenuButton onClick={() => { onDelete(goal.id); setShowMenu(false); }} danger>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </MenuButton>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-1">
        {goal.title}
      </h4>
      {goal.description && (
        <p className="text-[#5A6872] text-xs font-['Inter'] mb-3">{goal.description}</p>
      )}

      {/* Progress bar */}
      {goal.target_value > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[#9CA8B3] text-xs font-['Inter']">
              {goal.current_value} / {goal.target_value} {goal.unit}
            </span>
            <span
              className="text-xs font-['JetBrains_Mono'] font-semibold"
              style={{ color: progressColor }}
            >
              {progress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${progressColor}80, ${progressColor})`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 text-[11px] font-['Inter'] text-[#5A6872]">
        {daysLeft !== null && (
          <span style={{ color: isBehind ? '#FF4655' : isAtRisk ? '#FFCA3A' : '#5A6872' }}>
            {daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </span>
        )}
        {goal.linked_scenarios.length > 0 && (
          <span>{goal.linked_scenarios.length} linked scenario{goal.linked_scenarios.length > 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}

function MenuButton({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-left text-xs font-['Inter'] flex items-center gap-2 transition-colors ${
        danger
          ? 'text-[#FF4655] hover:bg-[#FF4655]/10'
          : 'text-[#ECE8E1] hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}
