import { useState } from 'react';
import { Loader2, ArrowRight, RotateCcw } from 'lucide-react';

interface WelcomeBackCardProps {
  onSyncAndDebrief: () => Promise<boolean>;
  onNotDoneYet: () => void;
}

export function WelcomeBackCard({
  onSyncAndDebrief,
  onNotDoneYet,
}: WelcomeBackCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [noScoresFound, setNoScoresFound] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setNoScoresFound(false);
    try {
      const found = await onSyncAndDebrief();
      if (!found) {
        setNoScoresFound(true);
        setSyncing(false);
      }
      // If found === true, Dashboard opens debrief modal and resets session.
      // Component will unmount via sessionActive becoming false.
    } catch {
      setNoScoresFound(true);
      setSyncing(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl overflow-hidden checkin-modal-breathing">
      <div className="bg-[#0F1923] border border-[#53CADC]/30 rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#53CADC]/15 flex items-center justify-center shrink-0">
            <span className="text-xl" role="img" aria-label="target">{'\u{1F3AF}'}</span>
          </div>
          <div>
            <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
              Welcome back, Commander
            </h3>
            <p className="text-[#9CA8B3] text-xs font-['Inter']">
              Ready to debrief your session?
            </p>
          </div>
        </div>

        {/* No scores feedback */}
        {noScoresFound && (
          <div className="mb-4 bg-[#FFCA3A]/10 border border-[#FFCA3A]/20 rounded-lg p-3">
            <p className="text-[#FFCA3A] text-xs font-['Inter'] leading-relaxed">
              No new scores detected yet. KovaaK's data may take a moment to propagate — try again in a few seconds, or head back to train more.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 bg-[#53CADC] hover:bg-[#53CADC]/90 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3 text-sm font-semibold font-['Inter'] flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#53CADC]/20"
          >
            {syncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Syncing scores...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Sync &amp; Debrief
              </>
            )}
          </button>

          <button
            onClick={onNotDoneYet}
            disabled={syncing}
            className="bg-[#1C2B36] hover:bg-white/5 border border-white/10 hover:border-white/20 text-[#9CA8B3] hover:text-[#ECE8E1] rounded-xl px-6 py-3 text-sm font-semibold font-['Inter'] flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Not done yet
          </button>
        </div>

        {/* Coaching nudge */}
        <p className="text-center text-[#5A6872] text-[11px] font-['Inter'] mt-3">
          Reflecting after training builds the self-awareness that separates grinders from improvers.
        </p>
      </div>
    </div>
  );
}
