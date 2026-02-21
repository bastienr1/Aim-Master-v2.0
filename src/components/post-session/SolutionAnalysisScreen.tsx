import { useState } from 'react';
import type { GroupedSession } from '@/types/debrief';
import {
  CORE_THEME_CHIPS,
  CONTEXTUAL_THEME_CHIPS,
  SHORT_SESSION_THRESHOLD_S,
} from '@/constants/debrief-config';
import { ThemeChip } from './ThemeChip';
import { EmojiReactionRow } from './EmojiReactionRow';

interface SolutionAnalysisData {
  primaryTheme: string | null;
  secondaryTheme: string | null;
  freeformText: string;
  emojiReaction: string | null;
}

interface SolutionAnalysisScreenProps {
  session: GroupedSession;
  onNext: (data: SolutionAnalysisData) => void;
}

export function SolutionAnalysisScreen({ session, onNext }: SolutionAnalysisScreenProps) {
  const [primaryTheme, setPrimaryTheme] = useState<string | null>(null);
  const [secondaryTheme, setSecondaryTheme] = useState<string | null>(null);
  const [freeformText, setFreeformText] = useState('');
  const [emojiReaction, setEmojiReaction] = useState<string | null>(null);

  // Determine which contextual chips to show
  const activeContextualChips = CONTEXTUAL_THEME_CHIPS.filter((chip) => {
    switch (chip.triggerCondition) {
      case 'prs_detected':
        return session.prsDetected.length > 0;
      case 'has_new_scenario':
        return session.hasNewScenario;
      case 'short_session':
        return session.durationSeconds < SHORT_SESSION_THRESHOLD_S;
      case 'scores_declined':
        return session.scoresDeclined;
      default:
        return false;
    }
  });

  const allChips = [...activeContextualChips, ...CORE_THEME_CHIPS];

  const handleChipClick = (chipId: string) => {
    if (primaryTheme === null) {
      setPrimaryTheme(chipId);
    } else if (chipId === primaryTheme) {
      // Deselect primary
      setPrimaryTheme(null);
      setSecondaryTheme(null);
    } else if (secondaryTheme === chipId) {
      // Deselect secondary
      setSecondaryTheme(null);
    } else {
      setSecondaryTheme(chipId);
    }
  };

  const handleEmojiSelect = (id: string) => {
    setEmojiReaction(emojiReaction === id ? null : id);
  };

  const canProceed = primaryTheme !== null || emojiReaction !== null;

  // Get placeholder for freeform based on selected primary theme
  const selectedChipConfig = allChips.find((c) => c.id === primaryTheme);
  const placeholder = selectedChipConfig?.placeholder || 'Anything you want to note...';

  return (
    <div className="space-y-5">
      {/* Section label */}
      <p className="text-[11px] font-['Inter'] text-[#5A6872] uppercase tracking-wider">
        What stood out?
      </p>

      {/* Primary theme chips (or secondary view after selection) */}
      {primaryTheme === null ? (
        <div className="grid grid-cols-2 gap-2">
          {allChips.map((chip) => (
            <ThemeChip
              key={chip.id}
              config={chip}
              selected={false}
              variant="primary"
              onClick={() => handleChipClick(chip.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Selected primary chip */}
          <div>
            <ThemeChip
              config={allChips.find((c) => c.id === primaryTheme)!}
              selected={true}
              variant="primary"
              onClick={() => handleChipClick(primaryTheme)}
            />
          </div>

          {/* Secondary chips (smaller row) */}
          <div className="flex flex-wrap gap-1.5">
            {allChips
              .filter((c) => c.id !== primaryTheme)
              .map((chip) => (
                <ThemeChip
                  key={chip.id}
                  config={chip}
                  selected={secondaryTheme === chip.id}
                  variant="secondary"
                  onClick={() => handleChipClick(chip.id)}
                />
              ))}
          </div>

          {/* Freeform textarea */}
          <textarea
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-4 py-3 text-sm font-['Inter'] text-[#ECE8E1] placeholder-[#5A6872] resize-none focus:outline-none focus:border-[#53CADC]/50 transition-colors duration-200"
            style={{ animation: 'debriefFadeIn 200ms ease-out' }}
          />
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] font-['Inter'] text-[#5A6872]">or quick reaction</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Emoji reactions */}
      <EmojiReactionRow selected={emojiReaction} onSelect={handleEmojiSelect} />

      {/* Next button */}
      <button
        onClick={() => onNext({ primaryTheme, secondaryTheme, freeformText, emojiReaction })}
        disabled={!canProceed}
        className="w-full rounded-lg py-3 text-sm font-semibold font-['Inter'] text-white transition-all duration-200"
        style={{
          backgroundColor: '#FF4655',
          opacity: canProceed ? 1 : 0.4,
          cursor: canProceed ? 'pointer' : 'not-allowed',
        }}
        onMouseEnter={(e) => {
          if (canProceed) e.currentTarget.style.filter = 'brightness(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
        }}
      >
        Next {'\u{2192}'}
      </button>

      <style>{`
        @keyframes debriefFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
