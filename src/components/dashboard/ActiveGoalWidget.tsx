import { useEffect, useState } from 'react';
import { Target, Plus, TrendingUp } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { GoalProgressEntry } from '@/types/goals';
import { useGoals } from '@/hooks/useGoals';

interface ActiveGoalWidgetProps {
  onNavigate: (tab: string) => void;
}

export function ActiveGoalWidget({ onNavigate }: ActiveGoalWidgetProps) {
  const { primaryGoal, isLoading, getProgressHistory } = useGoals();
  const [progressData, setProgressData] = useState<GoalProgressEntry[]>([]);

  useEffect(() => {
    if (primaryGoal) {
      getProgressHistory(primaryGoal.id).then(setProgressData);
    }
  }, [primaryGoal, getProgressHistory]);

  if (isLoading) return null;

  // No active goal — show CTA
  if (!primaryGoal) {
    return (
      <div
        className="rounded-xl p-5 mb-6 bg-[#1C2B36] border border-dashed border-[#FF4655]/30 cursor-pointer hover:border-[#FF4655]/50 transition-all"
        onClick={() => onNavigate('goals')}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FF4655]/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-[#FF4655]" />
          </div>
          <div className="flex-1">
            <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
              Set Your First Goal
            </h3>
            <p className="text-[#9CA8B3] text-sm font-['Inter']">
              Give your training a purpose — process goals drive real improvement
            </p>
          </div>
          <Plus className="w-5 h-5 text-[#FF4655]" />
        </div>
      </div>
    );
  }

  const progress = primaryGoal.target_value > 0
    ? Math.min(100, Math.round((primaryGoal.current_value / primaryGoal.target_value) * 100))
    : 0;

  const daysLeft = primaryGoal.deadline
    ? Math.max(0, Math.ceil((new Date(primaryGoal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Calculate week-over-week delta from progress entries
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentEntries = progressData.filter((e) => new Date(e.created_at) >= weekAgo);
  const weekDelta = recentEntries.reduce((sum, e) => sum + (e.delta || 0), 0);

  const sparklineData = [...progressData]
    .reverse()
    .slice(-7)
    .map((e) => ({ value: e.value_snapshot }));

  const isAtRisk = daysLeft !== null && daysLeft <= 3 && progress < 80;
  const progressColor = isAtRisk ? '#FFCA3A' : '#3DD598';

  return (
    <div
      className="rounded-xl p-5 mb-6 bg-[#2A3A47] border border-white/10 cursor-pointer hover:border-white/20 transition-all"
      onClick={() => onNavigate('goals')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[#FF4655]" />
          <h3 className="font-['Rajdhani'] text-sm font-semibold text-[#5A6872] uppercase tracking-wider">
            Active Mission
          </h3>
        </div>
        {daysLeft !== null && (
          <span className="text-[11px] font-['JetBrains_Mono'] text-[#5A6872]">
            {daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <h4 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-2">
            {primaryGoal.title}
          </h4>

          {/* Progress bar */}
          {primaryGoal.target_value > 0 && (
            <div className="mb-2">
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${progressColor}80, ${progressColor})`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-xs font-['JetBrains_Mono'] text-[#9CA8B3]">{progress}%</span>
                {weekDelta !== 0 && (
                  <span className="text-xs font-['Inter'] flex items-center gap-1" style={{ color: progressColor }}>
                    <TrendingUp className="w-3 h-3" />
                    {weekDelta > 0 ? '+' : ''}{weekDelta} {primaryGoal.unit} this week
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData.length > 2 && (
          <div className="w-20 h-[40px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="goalSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={progressColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={progressColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={progressColor}
                  strokeWidth={1.5}
                  fill="url(#goalSparkGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
