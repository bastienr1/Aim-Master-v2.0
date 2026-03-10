import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebriefData } from '@/hooks/useDebriefData';
import { useGoals } from '@/hooks/useGoals';
import type { GroupedSession, SessionDebrief } from '@/types/debrief';
import { SessionSummaryScreen } from './SessionSummaryScreen';
import { SolutionAnalysisScreen } from './SolutionAnalysisScreen';
import { SessionRatingScreen } from './SessionRatingScreen';
import { GoalCheckInScreen } from './GoalCheckInScreen';

interface PostSessionDebriefProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  sessionData: GroupedSession | null;
  activeProgramId?: string | null;
}

type Screen = 'summary' | 'analysis' | 'rating' | 'goal_checkin' | 'exiting';

const SCREEN_LABELS: Record<string, string> = {
  summary: '1/4',
  analysis: '2/4',
  rating: '3/4',
  goal_checkin: '4/4',
};

export function PostSessionDebrief({
  isOpen,
  onClose,
  onComplete,
  sessionData,
  activeProgramId,
}: PostSessionDebriefProps) {
  const { saveDebrief, getDebriefCount } = useDebriefData();
  const { primaryGoal, updateProgress } = useGoals();

  // Fallback empty session for when debrief opens without score data
  const emptySession: GroupedSession = {
    sessionStart: new Date().toISOString(),
    sessionEnd: new Date().toISOString(),
    durationSeconds: 0,
    plays: [],
    scenarioCount: 0,
    categories: {},
    prsDetected: [],
    scoreTrajectory: [],
    scoresDeclined: false,
    hasNewScenario: false,
  };
  const session = sessionData ?? emptySession;

  // Modal visibility state
  const [visible, setVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // Screen state
  const [screen, setScreen] = useState<Screen>('summary');
  const [screenTransition, setScreenTransition] = useState(false);

  // Debrief data accumulated across screens
  const debriefRef = useRef<SessionDebrief>({
    primaryTheme: null,
    secondaryTheme: null,
    freeformText: null,
    emojiReaction: null,
    sessionQuality: null,
  });

  const [debriefCount, setDebriefCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Entrance animation + load debrief count
  useEffect(() => {
    if (isOpen) {
      // Reset state
      setScreen('summary');
      setScreenTransition(false);
      setSubmitting(false);
      debriefRef.current = {
        primaryTheme: null,
        secondaryTheme: null,
        freeformText: null,
        emojiReaction: null,
        sessionQuality: null,
      };

      getDebriefCount().then(setDebriefCount);

      requestAnimationFrame(() => {
        setOverlayVisible(true);
        setTimeout(() => setVisible(true), 50);
      });
    } else {
      setVisible(false);
      setOverlayVisible(false);
    }
  }, [isOpen, getDebriefCount]);

  const exitModal = useCallback(
    (callback: () => void) => {
      setScreen('exiting');
      setVisible(false);
      setTimeout(() => {
        setOverlayVisible(false);
        setTimeout(callback, 200);
      }, 200);
    },
    []
  );

  const transitionToScreen = useCallback((next: Screen) => {
    setScreenTransition(true);
    setTimeout(() => {
      setScreen(next);
      setScreenTransition(false);
    }, 150);
  }, []);

  const handleSummaryNext = useCallback(() => {
    transitionToScreen('analysis');
  }, [transitionToScreen]);

  const handleAnalysisNext = useCallback(
    (data: {
      primaryTheme: string | null;
      secondaryTheme: string | null;
      freeformText: string;
      emojiReaction: string | null;
    }) => {
      debriefRef.current.primaryTheme = data.primaryTheme;
      debriefRef.current.secondaryTheme = data.secondaryTheme;
      debriefRef.current.freeformText = data.freeformText || null;
      debriefRef.current.emojiReaction = data.emojiReaction;
      transitionToScreen('rating');
    },
    [transitionToScreen]
  );

  const handleRatingComplete = useCallback(
    async (quality: number) => {
      if (submitting) return;

      debriefRef.current.sessionQuality = quality;

      // If there's an active primary goal, show goal check-in screen
      if (primaryGoal) {
        transitionToScreen('goal_checkin');
        return;
      }

      // No goal — save and exit
      setSubmitting(true);
      try {
        await saveDebrief(session, debriefRef.current, activeProgramId);
      } catch (err) {
        console.error('Failed to save debrief:', err);
      }
      setSubmitting(false);
      exitModal(onComplete);
    },
    [session, submitting, saveDebrief, exitModal, onComplete, primaryGoal, transitionToScreen, activeProgramId]
  );

  const handleGoalCheckInComplete = useCallback(
    async (data: { sentiment: 'setback' | 'neutral' | 'progress'; note: string }) => {
      if (submitting) return;
      setSubmitting(true);

      try {
        // Save debrief first
        const debriefId = await saveDebrief(session, debriefRef.current, activeProgramId);

        // Update goal progress based on sentiment
        if (primaryGoal) {
          const deltaMap = { setback: -1, neutral: 0, progress: 1 };
          const delta = deltaMap[data.sentiment];
          if (delta !== 0) {
            await updateProgress(primaryGoal.id, delta, 'debrief', data.note || undefined, debriefId || undefined);
          }
        }
      } catch (err) {
        console.error('Failed to save debrief with goal:', err);
      }

      setSubmitting(false);
      exitModal(onComplete);
    },
    [session, submitting, saveDebrief, exitModal, onComplete, primaryGoal, updateProgress]
  );

  const handleGoalCheckInSkip = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await saveDebrief(session, debriefRef.current, activeProgramId);
    } catch (err) {
      console.error('Failed to save debrief:', err);
    }
    setSubmitting(false);
    exitModal(onComplete);
  }, [session, submitting, saveDebrief, exitModal, onComplete, activeProgramId]);

  const handleDismiss = useCallback(() => {
    exitModal(onClose);
  }, [exitModal, onClose]);

  // Don't render if not open (allow empty session data — user may debrief without scores)
  if (!isOpen && !overlayVisible) return null;

  return (
    <>
      {(isOpen || overlayVisible) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
          role="dialog"
          aria-modal="true"
          aria-label="Post-Session Debrief"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-200"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              opacity: overlayVisible ? 1 : 0,
            }}
            onClick={handleDismiss}
          />

          {/* Modal card with breathing border */}
          <div
            className="relative w-full max-w-[480px] mx-4 sm:mx-auto rounded-2xl overflow-hidden checkin-modal-breathing"
            style={{
              backgroundColor: '#0F1923',
              opacity: visible ? 1 : 0,
              transform: visible
                ? 'translateY(0) scale(1)'
                : screen === 'exiting'
                ? 'translateY(10px) scale(0.98)'
                : 'translateY(20px) scale(0.98)',
              transition: 'opacity 250ms ease-out, transform 250ms ease-out',
              maxHeight: 'calc(100vh - 32px)',
            }}
          >
            <div className="overflow-y-auto max-h-[calc(100vh-32px)] p-8">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-['Rajdhani'] text-xl font-semibold text-[#ECE8E1]">
                    SESSION DEBRIEF
                  </h2>
                  {screen !== 'exiting' && (
                    <span className="text-[11px] font-['JetBrains_Mono'] text-[#5A6872] bg-white/[0.04] px-2 py-1 rounded-md">
                      {SCREEN_LABELS[screen]}
                    </span>
                  )}
                </div>
                <p className="text-xs font-['Inter'] text-[#5A6872] mt-1">
                  Reflect on your session
                </p>
              </div>

              {/* Screen content with transition */}
              <div
                className="transition-all duration-150 ease-in-out"
                style={{
                  opacity: screenTransition ? 0 : 1,
                  transform: screenTransition
                    ? 'translateX(-10px)'
                    : 'translateX(0)',
                }}
              >
                {screen === 'summary' && (
                  <SessionSummaryScreen
                    session={session}
                    onNext={handleSummaryNext}
                  />
                )}
                {screen === 'analysis' && (
                  <SolutionAnalysisScreen
                    session={session}
                    onNext={handleAnalysisNext}
                  />
                )}
                {screen === 'rating' && (
                  <SessionRatingScreen
                    debriefCount={debriefCount}
                    onComplete={handleRatingComplete}
                  />
                )}
                {screen === 'goal_checkin' && primaryGoal && (
                  <GoalCheckInScreen
                    goal={primaryGoal}
                    sessionCategories={session.categories}
                    onComplete={handleGoalCheckInComplete}
                    onSkip={handleGoalCheckInSkip}
                  />
                )}
              </div>

              {/* Skip / dismiss */}
              {screen !== 'exiting' && (
                <div className="flex justify-center mt-3">
                  <button
                    onClick={handleDismiss}
                    className="text-xs font-['Inter'] text-[#5A6872] hover:text-[#9CA8B3] transition-colors duration-200"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
