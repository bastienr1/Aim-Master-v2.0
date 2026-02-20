import { useState, useCallback } from 'react';
import { Lightbulb, Shuffle } from 'lucide-react';
import { MENTAL_GAME_TIPS } from '@/constants/mental-game-tips';

export function QuickTipCard() {
  const [tipIndex, setTipIndex] = useState(() =>
    Math.floor(Math.random() * MENTAL_GAME_TIPS.length)
  );
  const [rotating, setRotating] = useState(false);
  const [fading, setFading] = useState(false);

  const handleShuffle = useCallback(() => {
    if (rotating) return;

    // Pick a different tip
    let next = tipIndex;
    while (next === tipIndex && MENTAL_GAME_TIPS.length > 1) {
      next = Math.floor(Math.random() * MENTAL_GAME_TIPS.length);
    }
    const nextIndex = next;

    // Start icon rotation + text fade out
    setRotating(true);
    setFading(true);

    // At 150ms, swap the tip and fade back in
    setTimeout(() => {
      setTipIndex(nextIndex);
      setFading(false);
    }, 150);

    // At 300ms, reset rotation so it can spin again
    setTimeout(() => {
      setRotating(false);
    }, 300);
  }, [tipIndex, rotating]);

  return (
    <div className="bg-[#1C2B36] rounded-xl p-5 border-l-4 border-[#53CADC]">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#53CADC]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lightbulb className="w-4 h-4 text-[#53CADC]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-['Inter'] font-semibold text-[#53CADC] uppercase tracking-wider">
              Quick Tip
            </p>
            <button
              onClick={handleShuffle}
              className="p-1 rounded-md hover:bg-white/5 transition-colors duration-150 group"
              aria-label="Shuffle tip"
              disabled={rotating}
            >
              <Shuffle
                className="w-4 h-4 text-[#53CADC] group-hover:text-[#53CADC]/80"
                style={{
                  transform: rotating ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 300ms ease',
                }}
              />
            </button>
          </div>
          <p
            className="text-sm font-['Inter'] text-[#9CA8B3] italic leading-relaxed"
            style={{
              opacity: fading ? 0 : 1,
              transition: 'opacity 150ms ease',
            }}
          >
            "{MENTAL_GAME_TIPS[tipIndex]}"
          </p>
        </div>
      </div>
    </div>
  );
}
