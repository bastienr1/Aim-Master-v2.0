// src/components/mental-game/PinnedRecapCard.tsx
import { ChevronRight, X, Lightbulb, Trophy, Flame, BarChart3, FileText, Loader2 } from 'lucide-react';
import type { WeeklyRecap } from '@/hooks/useWeeklyRecap';
import { formatWeekRange } from '@/lib/weekBounds';

interface PinnedRecapCardProps {
  recap: WeeklyRecap;
  isDismissed: boolean;
  onDismiss: () => void;
  onShow: () => void;
  onViewFull: () => void;
}

export function PinnedRecapCard({ recap, isDismissed, onDismiss, onShow, onViewFull }: PinnedRecapCardProps) {
  if (isDismissed) {
    return (
      <button
        onClick={onShow}
        className="w-full bg-[#1C2B36]/50 rounded-lg p-3 border border-white/[0.04] flex items-center justify-between cursor-pointer hover:bg-[#1C2B36]/70 transition-colors"
      >
        <span className="font-['JetBrains_Mono'] text-[11px] text-[#5A6872]">
          📋 Week {recap.week_number} recap available
        </span>
        <span className="font-['Inter'] text-[11px] text-[#53CADC] flex items-center gap-1">
          Show Recap <ChevronRight className="w-3 h-3" />
        </span>
      </button>
    );
  }

  const weekRange = formatWeekRange(recap.week_start, recap.week_end);
  const durationMin = Math.round((recap.total_duration_seconds || 0) / 60);
  const maxNotes = 3;
  const scenarioNotes = recap.scenario_notes_collection || [];
  const freeformNotes = recap.session_notes || [];
  // Scenario notes take priority — they're the rich technique insights
  const hasScenarioNotes = scenarioNotes.length > 0;

  // Top themes sorted by frequency
  const themeEntries = Object.entries(recap.theme_frequency || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="bg-[#1C2B36] rounded-xl p-5 border-l-4 border-l-[#53CADC] border border-[#2A3A47] relative">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-['JetBrains_Mono'] text-[10px] font-medium uppercase tracking-[1.5px] text-[#53CADC]">
            📋 Last Week · Week {recap.week_number} — {weekRange}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-white/[0.06] transition-colors text-[#5A6872] hover:text-[#9CA8B3]"
          title="Hide recap"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Focus Area — Hero Element */}
      {recap.focus_area && (
        <div className="bg-[#0F1923] rounded-lg p-4 border border-[#53CADC]/15 mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-[#53CADC]" />
            <span className="font-['Inter'] text-[10px] font-semibold uppercase tracking-[1.5px] text-[#53CADC]">
              This Week's Focus
            </span>
          </div>
          <p className="font-['Inter'] text-[13px] text-[#ECE8E1] leading-relaxed">
            {recap.focus_area}
          </p>
        </div>
      )}

      {/* Stats Row — Compact */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {recap.prs_this_week > 0 && (
          <span className="font-['JetBrains_Mono'] text-[12px] text-[#FFCA3A] flex items-center gap-1">
            <Trophy className="w-3 h-3" /> {recap.prs_this_week} PR{recap.prs_this_week !== 1 ? 's' : ''}
          </span>
        )}
        <span className="font-['JetBrains_Mono'] text-[12px] text-[#9CA8B3] flex items-center gap-1">
          <Flame className="w-3 h-3" /> {recap.days_trained}d trained
        </span>
        {durationMin > 0 && (
          <span className="font-['JetBrains_Mono'] text-[12px] text-[#9CA8B3]">
            {durationMin} min
          </span>
        )}
        {recap.avg_session_quality && (
          <span className="font-['JetBrains_Mono'] text-[12px] text-[#9CA8B3] flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> Quality {recap.avg_session_quality.toFixed(1)}/5
          </span>
        )}
      </div>

      {/* Scenario Technique Notes (priority) — deduplicated, one per scenario */}
      {hasScenarioNotes && (() => {
        // Deduplicate: keep the LAST (most recent) unique note per scenario
        const uniqueByScenario = new Map<string, { scenario_name: string; notes_text: string }>();
        for (const note of scenarioNotes) {
          // Overwrite = last entry wins (most recent note for that scenario)
          uniqueByScenario.set(note.scenario_name, note);
        }
        const dedupedNotes = Array.from(uniqueByScenario.values());
        const totalScenarios = dedupedNotes.length;

        return (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3 h-3 text-[#5A6872]" />
              <span className="font-['Inter'] text-[10px] font-semibold uppercase tracking-[1.5px] text-[#5A6872]">
                Scenario Notes
              </span>
            </div>
            <div className="space-y-2">
              {dedupedNotes.slice(0, maxNotes).map((note, i) => (
                <div key={i} className="pl-3 border-l-2 border-[#53CADC]/20">
                  <p className="font-['JetBrains_Mono'] text-[10px] text-[#53CADC] mb-0.5">{note.scenario_name}</p>
                  <p className="font-['Inter'] text-[12px] text-[#9CA8B3] leading-relaxed">{note.notes_text}</p>
                </div>
              ))}
              {totalScenarios > maxNotes && (
                <p className="font-['Inter'] text-[10px] text-[#5A6872]">+{totalScenarios - maxNotes} more in full recap</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Freeform Reflection Notes (secondary) */}
      {!hasScenarioNotes && freeformNotes.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="w-3 h-3 text-[#5A6872]" />
            <span className="font-['Inter'] text-[10px] font-semibold uppercase tracking-[1.5px] text-[#5A6872]">
              Your Technique Notes
            </span>
          </div>
          <div className="space-y-1.5">
            {freeformNotes.slice(0, maxNotes).map((note, i) => (
              <p key={i} className="font-['Inter'] text-[12px] text-[#9CA8B3] leading-relaxed pl-3 border-l-2 border-white/[0.06]">
                "{note.text}"
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Theme Summary */}
      {themeEntries.length > 0 && (
        <p className="font-['Inter'] text-[11px] text-[#5A6872] mb-4">
          Top themes: {themeEntries.map(([theme, count]) => `${theme} (${count}×)`).join(' · ')}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onViewFull}
          className="font-['Rajdhani'] text-[12px] font-semibold uppercase tracking-wider text-[#53CADC] hover:text-[#7DD8E8] transition-colors"
        >
          View Full Recap →
        </button>
      </div>
    </div>
  );
}

// --- Generate Prompt Component ---

interface GenerateRecapPromptProps {
  weekNumber: number;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function GenerateRecapPrompt({ weekNumber, onGenerate, isGenerating }: GenerateRecapPromptProps) {
  return (
    <div className="bg-[#1C2B36]/60 rounded-xl p-5 border border-[#53CADC]/20 border-dashed">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-['Rajdhani'] text-[14px] font-semibold text-[#ECE8E1]">
            Your Week {weekNumber} recap is ready
          </p>
          <p className="font-['Inter'] text-[12px] text-[#5A6872] mt-0.5">
            Generate a summary of last week's training
          </p>
        </div>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="font-['Rajdhani'] text-[13px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg bg-[#53CADC]/15 text-[#53CADC] hover:bg-[#53CADC]/25 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Recap'
          )}
        </button>
      </div>
    </div>
  );
}
