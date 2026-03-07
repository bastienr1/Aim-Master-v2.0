import { useState } from 'react';
import { Target, TrendingDown, ArrowRight, TrendingUp } from 'lucide-react';
import type { Goal } from '@/types/goals';

interface GoalCheckInScreenProps {
  goal: Goal;
  sessionCategories: Record<string, number>;
  onComplete: (data: { sentiment: 'setback' | 'neutral' | 'progress'; note: string }) => void;
  onSkip: () => void;
}

const SENTIMENTS = [
  { id: 'setback' as const, label: 'Setback', icon: TrendingDown, color: '#FF4655' },
  { id: 'neutral' as const, label: 'Neutral', icon: ArrowRight, color: '#9CA8B3' },
  { id: 'progress' as const, label: 'Progress', icon: TrendingUp, color: '#3DD598' },
];

export function GoalCheckInScreen({ goal, sessionCategories, onComplete, onSkip }: GoalCheckInScreenProps) {
  const [sentiment, setSentiment] = useState<'setback' | 'neutral' | 'progress' | null>(null);
  const [note, setNote] = useState('');

  const progress = goal.target_value > 0
    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
    : 0;

  // Check if session categories match goal category
  const matchingCategories = goal.category
    ? Object.keys(sessionCategories).filter(
        (cat) => cat.toLowerCase().includes(goal.category!.toLowerCase())
      )
    : [];
  const matchCount = matchingCategories.reduce((sum, cat) => sum + (sessionCategories[cat] || 0), 0);

  const handleComplete = () => {
    if (!sentiment) return;
    onComplete({ sentiment, note });
  };

  return (
    <div className="space-y-5">
      {/* Goal card */}
      <div className="rounded-xl p-4 bg-[#1C2B36] border border-[#FF4655]/20">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-[#FF4655]" />
          <span className="text-[10px] font-['JetBrains_Mono'] text-[#FF4655] uppercase tracking-wider">
            Active Goal
          </span>
        </div>
        <h4 className="font-['Rajdhani'] text-base font-semibold text-[#ECE8E1] mb-2">
          {goal.title}
        </h4>
        {goal.target_value > 0 && (
          <div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #3DD59880, #3DD598)',
                }}
              />
            </div>
            <span className="text-[11px] font-['JetBrains_Mono'] text-[#5A6872] mt-1 block">
              {goal.current_value} / {goal.target_value} {goal.unit} ({progress}%)
            </span>
          </div>
        )}
      </div>

      {/* Question */}
      <div>
        <p className="text-sm font-['Inter'] text-[#ECE8E1] mb-3">
          Did this session move you closer?
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SENTIMENTS.map((s) => {
            const Icon = s.icon;
            const isSelected = sentiment === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSentiment(s.id)}
                className="rounded-xl p-3 text-center transition-all border"
                style={{
                  backgroundColor: isSelected ? `${s.color}15` : '#1C2B36',
                  borderColor: isSelected ? `${s.color}40` : 'rgba(255,255,255,0.05)',
                }}
              >
                <Icon
                  className="w-5 h-5 mx-auto mb-1"
                  style={{ color: isSelected ? s.color : '#5A6872' }}
                />
                <span
                  className="text-xs font-['Inter']"
                  style={{ color: isSelected ? s.color : '#5A6872' }}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress note */}
      <div>
        <label className="text-xs font-['Inter'] text-[#5A6872] mb-1.5 block">
          Progress note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you notice about your goal this session?"
          rows={2}
          className="w-full bg-[#1C2B36] border border-white/10 rounded-lg px-4 py-3 text-sm font-['Inter'] text-[#ECE8E1] placeholder-[#5A6872] outline-none focus:border-[#FF4655]/50 transition-colors resize-none"
        />
      </div>

      {/* Auto-detected info */}
      {matchCount > 0 && (
        <div className="rounded-lg p-3 bg-[#53CADC]/5 border border-[#53CADC]/20">
          <p className="text-xs font-['Inter'] text-[#53CADC]">
            Auto-detected: {matchCount} {goal.category} scenario{matchCount > 1 ? 's' : ''} played this session
          </p>
        </div>
      )}

      {/* Complete button */}
      <button
        onClick={handleComplete}
        disabled={!sentiment}
        className="w-full rounded-lg py-3 text-sm font-semibold font-['Inter'] text-white transition-all"
        style={{
          backgroundColor: '#FF4655',
          opacity: sentiment ? 1 : 0.4,
          cursor: sentiment ? 'pointer' : 'not-allowed',
        }}
      >
        Complete Session
      </button>

      {/* Skip */}
      <div className="flex justify-center">
        <button
          onClick={onSkip}
          className="text-xs font-['Inter'] text-[#5A6872] hover:text-[#9CA8B3] transition-colors"
        >
          Skip goal check-in
        </button>
      </div>
    </div>
  );
}
