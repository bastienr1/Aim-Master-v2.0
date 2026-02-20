import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckinSlider } from './CheckinSlider';
import { IntentSelector } from './IntentSelector';
import { CoachingInsight } from './CoachingInsight';
import { SkipToast } from './SkipToast';
import { useCheckinData } from '@/hooks/useCheckinData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ENERGY_CONFIG, FOCUS_CONFIG, MOOD_CONFIG } from '@/constants/checkin-config';

interface PreTrainingCheckinProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onIntentComplete?: (intent: string) => void;
  onSwitchToTraining?: () => void;
}

type ModalState = 'form' | 'coaching' | 'exiting';

export function PreTrainingCheckin({ isOpen, onClose, onComplete, onIntentComplete, onSwitchToTraining }: PreTrainingCheckinProps) {
  const { user } = useAuth();
  const {
    saveCheckin,
    saveSkippedCheckin,
    getCheckinCount,
    getTier,
    getCoachingInsight,
    updateCoachingTip,
  } = useCheckinData();

  // Form state
  const [energy, setEnergy] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [intent, setIntent] = useState<string | null>(null);

  // Modal state
  const [modalState, setModalState] = useState<ModalState>('form');
  const [coachingMessage, setCoachingMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [showSkipToast, setShowSkipToast] = useState(false);

  // KovaaK's connection status
  const [hasKovaaks, setHasKovaaks] = useState(false);

  // Encouragement overlay for "improve" intent
  const [showEncouragement, setShowEncouragement] = useState(false);

  const checkinIdRef = useRef<string | null>(null);

  // Check if user has a KovaaK's account
  useEffect(() => {
    const checkKovaaks = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('kovaaks_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
		setHasKovaaks(!!data);
    };
    checkKovaaks();
  }, [user]);

  // Entrance animation + load session count
  useEffect(() => {
    if (isOpen) {
      setEnergy(null);
      setFocus(null);
      setMood(null);
      setIntent(null);
      setModalState('form');
      setCoachingMessage('');
      setSubmitting(false);
      setShowEncouragement(false);
      checkinIdRef.current = null;

      getCheckinCount().then((count) => {
        setSessionNumber(count + 1);
      });

      requestAnimationFrame(() => {
        setOverlayVisible(true);
        setTimeout(() => setVisible(true), 50);
      });
    } else {
      setVisible(false);
      setOverlayVisible(false);
    }
  }, [isOpen, getCheckinCount]);

  const canSubmit = energy !== null && focus !== null && intent !== null;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    try {
      const row = await saveCheckin({
        energy_level: energy!,
        focus_level: focus!,
        mood_level: mood,
        session_intent: intent!,
      });

      if (row) {
        checkinIdRef.current = row.id;
      }

      const count = await getCheckinCount();
      const tier = getTier(count);
      const message = await getCoachingInsight(
        {
          energy_level: energy!,
          focus_level: focus!,
          mood_level: mood,
          session_intent: intent!,
        },
        tier
      );

      setCoachingMessage(message);

      if (row) {
        await updateCoachingTip(row.id, message);
      }

      const selectedIntent = intent!;
			console.log('selectedIntent:', selectedIntent);
			console.log('onIntentComplete exists:', !!onIntentComplete);
			console.log('onSwitchToTraining exists:', !!onSwitchToTraining);

      if (selectedIntent === 'improve') {
        // Show encouragement overlay for 2.5s, keep button in loading state
        setShowEncouragement(true);
        setTimeout(() => {
          setSubmitting(false);
          setShowEncouragement(false);
          onIntentComplete?.(selectedIntent);
          onSwitchToTraining?.();
          exitModal(onComplete);
        }, 2500);
        return;
      }

      if (selectedIntent === 'warmup') {
        setSubmitting(false);
        onIntentComplete?.(selectedIntent);
        onSwitchToTraining?.();
        exitModal(onComplete);
        return;
      }

      // For push_pr and maintain: show coaching insight
      setSubmitting(false);
      setModalState('coaching');
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitting(false);
      setCoachingMessage('Every session counts. Stay present and trust the process.');
      setModalState('coaching');
    }
  }, [canSubmit, submitting, energy, focus, mood, intent, saveCheckin, getCheckinCount, getTier, getCoachingInsight, updateCoachingTip, onIntentComplete, onSwitchToTraining, onComplete]);

  const handleSkip = useCallback(async () => {
    await saveSkippedCheckin();
    setShowSkipToast(true);
    exitModal(onClose);
  }, [saveSkippedCheckin, onClose]);

  const handleCoachingDismiss = useCallback(() => {
    exitModal(onComplete);
  }, [onComplete]);

  const exitModal = (callback: () => void) => {
    setModalState('exiting');
    setVisible(false);
    setTimeout(() => {
      setOverlayVisible(false);
      setTimeout(callback, 200);
    }, 200);
  };

  if (!isOpen && !overlayVisible && !showSkipToast) return null;

  return (
    <>
      <SkipToast visible={showSkipToast} onDone={() => setShowSkipToast(false)} />

      {(isOpen || overlayVisible) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
          role="dialog"
          aria-modal="true"
          aria-label="Pre-Training Check-in"
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
            onClick={handleSkip}
          />

          {/* Modal card with breathing border */}
          <div
            className="relative w-full max-w-[440px] mx-4 sm:mx-auto rounded-2xl overflow-hidden checkin-modal-breathing"
            style={{
              backgroundColor: '#0F1923',
              opacity: visible ? 1 : 0,
              transform: visible
                ? 'translateY(0) scale(1)'
                : modalState === 'exiting'
                ? 'translateY(10px) scale(0.98)'
                : 'translateY(20px) scale(0.98)',
              transition: 'opacity 250ms ease-out, transform 250ms ease-out',
              maxHeight: 'calc(100vh - 32px)',
            }}
          >
            <div className="overflow-y-auto max-h-[calc(100vh-32px)] p-8">
              {/* ─── FORM STATE ─── */}
              <div
                className="transition-all duration-300 ease-in-out"
                style={{
                  opacity: modalState === 'form' ? 1 : 0,
                  transform: modalState === 'form' ? 'translateY(0)' : 'translateY(-8px)',
                  display: (modalState === 'coaching' || modalState === 'exiting') && coachingMessage ? 'none' : 'block',
                  pointerEvents: modalState === 'form' ? 'auto' : 'none',
                }}
              >
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-['Rajdhani'] text-xl font-semibold text-[#ECE8E1]">
                      Pre-Training Check-in
                    </h2>
                    {sessionNumber !== null && (
                      <span className="text-[11px] font-['JetBrains_Mono'] text-[#5A6872] bg-white/[0.04] px-2 py-1 rounded-md">
                        Session #{sessionNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-['Inter'] text-[#5A6872] mt-1">
                    Quick readiness scan · 30 seconds
                  </p>
                </div>

                {/* Questions */}
                <div className="space-y-6">
                  <CheckinSlider
                    label={ENERGY_CONFIG.label}
                    value={energy}
                    onChange={setEnergy}
                    config={ENERGY_CONFIG}
                  />
                  <CheckinSlider
                    label={FOCUS_CONFIG.label}
                    value={focus}
                    onChange={setFocus}
                    config={FOCUS_CONFIG}
                  />
                  <CheckinSlider
                    label={MOOD_CONFIG.label}
                    value={mood}
                    onChange={setMood}
                    config={MOOD_CONFIG}
                  />
                  <IntentSelector value={intent} onChange={setIntent} hasKovaaks={hasKovaaks} />
                </div>

                {/* Footer */}
                <div className="mt-8">
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit || submitting}
                    className={`w-full rounded-lg py-3 text-sm font-semibold font-['Inter'] text-white transition-all duration-200 flex items-center justify-center gap-2${
                      canSubmit && !submitting ? ' checkin-ready-pulse' : ''
                    }`}
                    style={{
                      backgroundColor: '#FF4655',
                      opacity: canSubmit && !submitting ? 1 : 0.4,
                      cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed',
                    }}
                    onMouseEnter={(e) => {
                      if (canSubmit && !submitting) {
                        e.currentTarget.style.filter = 'brightness(1.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = 'brightness(1)';
                    }}
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      'Ready to Train'
                    )}
                  </button>

                  {/* Encouragement overlay for "improve" intent */}
                  {showEncouragement && (
                    <div
                      className="mt-4 rounded-lg p-4 border-l-2 cursor-pointer"
                      style={{
                        backgroundColor: 'rgba(28, 43, 54, 0.9)',
                        borderLeftColor: '#53CADC',
                        animation: 'checkinFadeIn 200ms ease-out',
                      }}
                      onClick={() => {
                        setSubmitting(false);
                        setShowEncouragement(false);
                        onIntentComplete?.('improve');
                        onSwitchToTraining?.();
                        exitModal(onComplete);
                      }}
                    >
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ECE8E1', lineHeight: '1.6' }}>
                        Deliberate practice is the fastest path to rank up. The scenarios ahead target your weak areas — that's where real growth happens.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-center mt-3">
                    <button
                      onClick={handleSkip}
                      className="text-xs font-['Inter'] text-[#5A6872] hover:text-[#9CA8B3] transition-colors duration-200"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── COACHING STATE ─── */}
              {(modalState === 'coaching' || (modalState === 'exiting' && coachingMessage)) && (
                <div className="min-h-[200px] flex flex-col justify-center">
                  <CoachingInsight
                    message={coachingMessage}
                    onDismiss={handleCoachingDismiss}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes checkinFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
