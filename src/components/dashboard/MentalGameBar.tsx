import { Brain, Sparkles, ArrowRight } from 'lucide-react';

interface MentalGameBarProps {
  streakDays: number;
  onCheckin: () => void;
  onNavigate: (tab: string) => void;
}

export function MentalGameBar({ streakDays, onCheckin, onNavigate }: MentalGameBarProps) {
  return (
    <div
      className="bg-gradient-to-r from-[#1C2B36] to-[#1C2B36] border border-[#53CADC]/15 rounded-xl p-5 mb-6 hover:border-[#53CADC]/30 transition-all cursor-pointer group"
      onClick={() => onNavigate('mental')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#53CADC]/10 flex items-center justify-center group-hover:bg-[#53CADC]/15 transition-colors">
            <Brain className="w-5 h-5 text-[#53CADC]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Rajdhani'] text-[15px] font-semibold text-[#ECE8E1]">
                Mental Game
              </h3>
              <span className="bg-[#53CADC]/10 text-[#53CADC] text-[10px] font-['Inter'] font-semibold px-2 py-0.5 rounded-full">
                {streakDays} day streak
              </span>
            </div>
            <p className="text-[#9CA8B3] text-[12px] font-['Inter'] mt-0.5">
              Pre-training check-ins build consistency — the #1 predictor of improvement.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onCheckin(); }}
            className="hidden sm:flex bg-[#53CADC]/10 border border-[#53CADC]/30 text-[#53CADC] rounded-lg px-3 py-1.5 text-[12px] font-['Inter'] font-medium hover:bg-[#53CADC]/20 transition-all items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3" /> Check-in
          </button>
          <ArrowRight className="w-4 h-4 text-[#5A6872] group-hover:text-[#53CADC] transition-colors" />
        </div>
      </div>
    </div>
  );
}
