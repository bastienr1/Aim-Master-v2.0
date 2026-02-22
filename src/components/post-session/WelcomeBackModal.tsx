import { useState } from 'react';
import { Loader2, ArrowRight, RotateCcw, X } from 'lucide-react';

interface WelcomeBackModalProps {
  isOpen: boolean;
  onSyncAndDebrief: () => Promise<boolean>;
  onNotDoneYet: () => void;
  onDismiss: () => void;
}

export function WelcomeBackModal({
  isOpen,
  onSyncAndDebrief,
  onNotDoneYet,
  onDismiss,
}: WelcomeBackModalProps) {
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
      // If found === true, Dashboard opens debrief modal.
      // This modal closes via isOpen becoming false.
    } catch {
      setNoScoresFound(true);
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="Session Active"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={onDismiss}
      />

      {/* Modal card with breathing border */}
      <div
        className="relative w-full max-w-[440px] mx-4 sm:mx-auto rounded-2xl overflow-hidden checkin-modal-breathing animate-slide-up"
        style={{ backgroundColor: '#0F1923' }}
      >
        <div className="p-8">
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[#5A6872] hover:text-[#9CA8B3] hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#53CADC]/15 flex items-center justify-center shrink-0">
              <span className="text-2xl" role="img" aria-label="target">{'\u{1F3AF}'}</span>
            </div>
            <div>
              <h2 className="font-['Rajdhani'] text-xl font-semibold text-[#ECE8E1]">
                Session Active
              </h2>
              <p className="text-[#9CA8B3] text-xs font-['Inter'] mt-0.5">
                KovaaK's is loading — train hard, Commander.
              </p>
            </div>
          </div>

          {/* Status message */}
          <div className="mb-5 bg-[#53CADC]/8 border border-[#53CADC]/20 rounded-lg p-3">
            <p className="text-[#9CA8B3] text-xs font-['Inter'] leading-relaxed">
              When you're done training, come back here and hit <span className="text-[#53CADC] font-semibold">Sync & Debrief</span> to review your session. Your scores will be synced automatically.
            </p>
          </div>

          {/* No scores feedback */}
          {noScoresFound && (
            <div className="mb-5 bg-[#FFCA3A]/10 border border-[#FFCA3A]/20 rounded-lg p-3">
              <p className="text-[#FFCA3A] text-xs font-['Inter'] leading-relaxed">
                No new scores detected yet. KovaaK's data may take a moment to propagate — try again in a few seconds, or head back to train more.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full bg-[#53CADC] hover:bg-[#53CADC]/90 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3.5 text-sm font-semibold font-['Inter'] flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#53CADC]/20"
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
              className="w-full bg-[#1C2B36] hover:bg-white/5 border border-white/10 hover:border-white/20 text-[#9CA8B3] hover:text-[#ECE8E1] rounded-xl px-6 py-3 text-sm font-semibold font-['Inter'] flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Not done yet
            </button>
          </div>

          {/* Coaching nudge */}
          <p className="text-center text-[#5A6872] text-[11px] font-['Inter'] mt-4">
            Reflecting after training builds the self-awareness that separates grinders from improvers.
          </p>
        </div>
      </div>
    </div>
  );
}
