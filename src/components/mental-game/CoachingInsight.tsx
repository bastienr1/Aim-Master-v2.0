import { useEffect, useRef, useState, useCallback } from 'react';

interface CoachingInsightProps {
  message: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8000;

const BrainIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 2C5.8 2 4 3.8 4 6C4 7.1 4.5 8.1 5.2 8.8L5 12H7L7.2 9.5C7.5 9.8 7.7 10 8 10C8.3 10 8.5 9.8 8.8 9.5L9 12H11L10.8 8.8C11.5 8.1 12 7.1 12 6C12 3.8 10.2 2 8 2Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 5.5C6 5.5 6.5 4.5 8 4.5C9.5 4.5 10 5.5 10 5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    <circle cx="3" cy="4" r="0.8" fill="currentColor" opacity="0.5" />
    <circle cx="13" cy="4" r="0.8" fill="currentColor" opacity="0.5" />
    <circle cx="2" cy="7" r="0.5" fill="currentColor" opacity="0.3" />
    <circle cx="14" cy="7" r="0.5" fill="currentColor" opacity="0.3" />
  </svg>
);

export function CoachingInsight({ message, onDismiss }: CoachingInsightProps) {
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [animationStarted, setAnimationStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(AUTO_DISMISS_MS);
  const timerStartRef = useRef(0);

  // Entrance animation
  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(true);
      setAnimationStarted(true);
    }, 20);
    return () => clearTimeout(t);
  }, []);

  // Start / resume the auto-dismiss timer
  const startTimer = useCallback((duration: number) => {
    timerStartRef.current = Date.now();
    remainingRef.current = duration;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);
  }, []);

  // Kick off the initial timer once visible
  useEffect(() => {
    if (animationStarted) {
      startTimer(AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [animationStarted, startTimer]);

  const handleMouseEnter = useCallback(() => {
    setPaused(true);
    // Calculate how much time is left and store it
    const elapsed = Date.now() - timerStartRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPaused(false);
    if (remainingRef.current > 0) {
      startTimer(remainingRef.current);
    } else {
      handleDismiss();
    }
  }, [startTimer]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  // Handle animation end on the progress bar (backup auto-dismiss)
  const handleAnimationEnd = useCallback(() => {
    handleDismiss();
  }, []);

  return (
    <>
      {/* Inline keyframe definition */}
      <style>{`
        @keyframes coaching-deplete {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      <div
        className="transition-all duration-300 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#1C2B36',
            borderLeft: '3px solid rgba(83, 202, 220, 0.6)',
          }}
        >
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="text-[#53CADC]">
                <BrainIcon />
              </div>
              <span
                className="text-[10px] font-semibold font-['Inter'] uppercase tracking-wider text-[#53CADC]"
                style={{
                  textShadow: '0 0 8px rgba(83, 202, 220, 0.3)',
                }}
              >
                Session Intel
              </span>
            </div>

            {/* Message */}
            <p className="text-sm font-['Inter'] text-[#ECE8E1] leading-relaxed">
              {message}
            </p>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="mt-4 text-[13px] font-['Inter'] text-[#9CA8B3] hover:text-[#ECE8E1] transition-colors duration-200"
            >
              Got it
            </button>
          </div>

          {/* Progress bar — CSS keyframe depletion */}
          <div
            className="w-full"
            style={{
              height: '2px',
              backgroundColor: 'rgba(83, 202, 220, 0.1)',
            }}
          >
            <div
              onAnimationEnd={handleAnimationEnd}
              style={{
                height: '100%',
                backgroundColor: '#53CADC',
                width: animationStarted ? undefined : '100%',
                animation: animationStarted
                  ? `coaching-deplete ${AUTO_DISMISS_MS}ms linear forwards`
                  : 'none',
                animationPlayState: paused ? 'paused' : 'running',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
