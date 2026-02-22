import { useState } from 'react';
import { Loader2, ArrowRight, RotateCcw, ChevronUp } from 'lucide-react';

interface WelcomeBackModalProps {
  isOpen: boolean;
  minimized: boolean;
  onSyncAndDebrief: () => Promise<boolean>;
  onMinimize: () => void;
  onExpand: () => void;
}

export function WelcomeBackModal({
  isOpen,
  minimized,
  onSyncAndDebrief,
  onMinimize,
  onExpand,
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
    } catch {
      setNoScoresFound(true);
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  // ─── MINIMIZED STATE: compact pill modal ───
  if (minimized) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center pb-8 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-label="Session Active"
      >
        <div
          className="pointer-events-auto rounded-2xl overflow-hidden checkin-modal-breathing animate-slide-up"
          style={{ backgroundColor: '#0F1923' }}
        >
          <div className="px-6 py-4 flex items-center gap-4">
            {/* Pulse dot + status */}
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
                <div className="absolute w-2.5 h-2.5 rounded-full bg-[#53CADC] animate-ping opacity-40" />
                <div className="w-2 h-2 rounded-full bg-[#53CADC]" />
              </div>
              <span className="text-[#ECE8E1] text-sm font-semibold font-['Rajdhani'] whitespace-nowrap">
                Session Active
              </span>
            </div>

            <div className="w-px h-5 bg-white/10" />

            {/* Continue Session */}
            <button
              onClick={onExpand}
              className="flex items-center gap-1.5 text-[#53CADC] hover:text-[#53CADC]/80 text-xs font-semibold font-['Inter'] whitespace-nowrap transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Continue Session
            </button>

            <div className="w-px h-5 bg-white/10" />

            {/* End Session */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-[#FF4655] hover:text-[#FF4655]/80 disabled:opacity-60 text-xs font-semibold font-['Inter'] whitespace-nowrap transition-colors"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Syncing...
                </>
              ) : (
                'End Session'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── FULL STATE: standard modal ───
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
      role="dialog"
      aria-modal="true"
      aria-label="Session Active"
    >
      {/* Overlay — clicking minimizes instead of closing */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={onMinimize}
      />

      {/* Modal card with breathing border */}
      <div
        className="relative w-full max-w-[440px] mx-4 sm:mx-auto rounded-2xl overflow-hidden checkin-modal-breathing animate-slide-up"
        style={{ backgroundColor: '#0F1923' }}
      >
        <div className="p-8">
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
              onClick={onMinimize}
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
