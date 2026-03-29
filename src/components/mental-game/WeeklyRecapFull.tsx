// src/components/mental-game/WeeklyRecapFull.tsx
import { ArrowLeft, Trophy, Flame, Clock, Target, Brain, FileText, Lightbulb } from 'lucide-react';
import type { WeeklyRecap } from '@/hooks/useWeeklyRecap';
import { formatWeekRange } from '@/lib/weekBounds';

interface WeeklyRecapFullProps {
  recap: WeeklyRecap;
  onBack: () => void;
}

export function WeeklyRecapFull({ recap, onBack }: WeeklyRecapFullProps) {
  const weekRange = formatWeekRange(recap.week_start, recap.week_end);
  const durationMin = Math.round((recap.total_duration_seconds || 0) / 60);
  const themeEntries = Object.entries(recap.theme_frequency || {}).sort(([, a], [, b]) => b - a);
  const emojiEntries = Object.entries(recap.emoji_frequency || {}).sort(([, a], [, b]) => b - a);
  const intentEntries = Object.entries(recap.intent_distribution || {}).sort(([, a], [, b]) => b - a);
  const categoryEntries = Object.entries(recap.categories_trained || {}).sort(([, a], [, b]) => (b as number) - (a as number));
  const notes = recap.session_notes || [];

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#53CADC] hover:text-[#7DD8E8] transition-colors mb-4 font-['Inter'] text-[13px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Mental Game
        </button>
        <div className="flex items-baseline gap-3">
          <h2 className="font-['Rajdhani'] text-[24px] font-bold text-[#ECE8E1]">
            Week {recap.week_number} Recap
          </h2>
          <span className="font-['JetBrains_Mono'] text-[12px] text-[#5A6872]">
            {weekRange}, {recap.year}
          </span>
        </div>
        {recap.summary_text && (
          <p className="font-['Inter'] text-[13px] text-[#9CA8B3] mt-2 leading-relaxed">
            {recap.summary_text}
          </p>
        )}
      </div>

      {/* Highlight */}
      {recap.highlight && (
        <div className="bg-[#1C2B36] rounded-xl p-4 border border-[#FFCA3A]/20">
          <p className="font-['Inter'] text-[14px] text-[#ECE8E1]">{recap.highlight}</p>
        </div>
      )}

      {/* Focus Area */}
      {recap.focus_area && (
        <div className="bg-[#0F1923] rounded-xl p-5 border border-[#53CADC]/15">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-4 h-4 text-[#53CADC]" />
            <span className="font-['Inter'] text-[11px] font-semibold uppercase tracking-[1.5px] text-[#53CADC]">
              Focus Area
            </span>
          </div>
          <p className="font-['Inter'] text-[14px] text-[#ECE8E1] leading-relaxed">{recap.focus_area}</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Flame className="w-4 h-4" />} label="Days Trained" value={`${recap.days_trained}/5`} color="#FF4655" />
        <StatCard icon={<Target className="w-4 h-4" />} label="Sessions" value={String(recap.total_sessions)} color="#53CADC" />
        <StatCard icon={<Clock className="w-4 h-4" />} label="Minutes" value={String(durationMin)} color="#FFCA3A" />
        <StatCard icon={<Trophy className="w-4 h-4" />} label="PRs" value={String(recap.prs_this_week)} color="#3DD598" />
      </div>

      {/* Mental Game Averages */}
      {recap.total_checkins > 0 && (
        <div className="bg-[#1C2B36] rounded-xl p-5 border border-white/[0.06]">
          <h3 className="font-['Rajdhani'] text-[14px] font-semibold uppercase tracking-wider text-[#53CADC] mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Mental Game Averages
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat label="Energy" value={recap.avg_energy} />
            <MiniStat label="Focus" value={recap.avg_focus} />
            <MiniStat label="Mood" value={recap.avg_mood} />
            <MiniStat label="Readiness" value={recap.avg_readiness} />
          </div>
        </div>
      )}

      {/* Themes */}
      {themeEntries.length > 0 && (
        <div className="bg-[#1C2B36] rounded-xl p-5 border border-white/[0.06]">
          <h3 className="font-['Rajdhani'] text-[14px] font-semibold uppercase tracking-wider text-[#53CADC] mb-3">
            Theme Analysis
          </h3>
          <div className="space-y-2">
            {themeEntries.map(([theme, count]) => (
              <div key={theme} className="flex items-center justify-between">
                <span className="font-['Inter'] text-[13px] text-[#ECE8E1]">{theme}</span>
                <span className="font-['JetBrains_Mono'] text-[12px] text-[#5A6872]">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Trained */}
      {categoryEntries.length > 0 && (
        <div className="bg-[#1C2B36] rounded-xl p-5 border border-white/[0.06]">
          <h3 className="font-['Rajdhani'] text-[14px] font-semibold uppercase tracking-wider text-[#53CADC] mb-3">
            Categories Trained
          </h3>
          <div className="space-y-2">
            {categoryEntries.map(([cat, count]) => {
              const maxCount = Number(categoryEntries[0]?.[1]) || 1;
              const pct = (Number(count) / maxCount) * 100;
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="font-['Inter'] text-[12px] text-[#ECE8E1] w-24 shrink-0">{cat}</span>
                  <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#53CADC]/40 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-['JetBrains_Mono'] text-[11px] text-[#5A6872] w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session Notes */}
      {notes.length > 0 && (
        <div className="bg-[#1C2B36] rounded-xl p-5 border border-white/[0.06]">
          <h3 className="font-['Rajdhani'] text-[14px] font-semibold uppercase tracking-wider text-[#53CADC] mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Session Notes
          </h3>
          <div className="space-y-3">
            {notes.map((note, i) => (
              <div key={i} className="pl-3 border-l-2 border-white/[0.08]">
                <p className="font-['Inter'] text-[13px] text-[#ECE8E1] leading-relaxed">"{note.text}"</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#5A6872]">
                    {new Date(note.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {note.theme && <span className="font-['Inter'] text-[10px] text-[#5A6872]">· {note.theme}</span>}
                  {note.emoji && <span className="text-[12px]">{note.emoji}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenario Notes — grouped by scenario, chronological entries */}
      {(recap.scenario_notes_collection || []).length > 0 && (() => {
        // Group notes by scenario_name, preserving chronological order
        const grouped = new Map<string, Array<{ session_date: string; notes_text: string }>>();
        for (const note of recap.scenario_notes_collection) {
          if (!grouped.has(note.scenario_name)) {
            grouped.set(note.scenario_name, []);
          }
          const entries = grouped.get(note.scenario_name)!;
          // Deduplicate: skip if the same note text already exists for this scenario
          const isDuplicate = entries.some(e => e.notes_text === note.notes_text);
          if (!isDuplicate) {
            entries.push({ session_date: note.session_date, notes_text: note.notes_text });
          }
        }

        return (
          <div className="bg-[#1C2B36] rounded-xl p-5 border border-white/[0.06]">
            <h3 className="font-['Rajdhani'] text-[14px] font-semibold uppercase tracking-wider text-[#53CADC] mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Scenario Notes
            </h3>
            <div className="space-y-4">
              {Array.from(grouped.entries()).map(([scenarioName, entries]) => (
                <div key={scenarioName} className="pl-3 border-l-2 border-[#53CADC]/20">
                  <p className="font-['JetBrains_Mono'] text-[11px] font-medium text-[#53CADC] mb-2">{scenarioName}</p>
                  <div className="space-y-2">
                    {entries.map((entry, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="font-['JetBrains_Mono'] text-[10px] text-[#5A6872] shrink-0 pt-0.5 w-20">
                          {new Date(entry.session_date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                        </span>
                        <p className="font-['Inter'] text-[12px] text-[#ECE8E1] leading-relaxed">{entry.notes_text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Intent + Emoji Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {intentEntries.length > 0 && (
          <div className="bg-[#1C2B36] rounded-xl p-4 border border-white/[0.06]">
            <h4 className="font-['Rajdhani'] text-[12px] font-semibold uppercase tracking-wider text-[#5A6872] mb-2">Intent Distribution</h4>
            <div className="flex flex-wrap gap-2">
              {intentEntries.map(([intent, count]) => (
                <span key={intent} className="font-['JetBrains_Mono'] text-[11px] text-[#9CA8B3] bg-white/[0.04] px-2 py-1 rounded">
                  {intent}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
        {emojiEntries.length > 0 && (
          <div className="bg-[#1C2B36] rounded-xl p-4 border border-white/[0.06]">
            <h4 className="font-['Rajdhani'] text-[12px] font-semibold uppercase tracking-wider text-[#5A6872] mb-2">Emoji Reactions</h4>
            <div className="flex flex-wrap gap-2">
              {emojiEntries.map(([emoji, count]) => (
                <span key={emoji} className="text-[16px] bg-white/[0.04] px-2 py-1 rounded flex items-center gap-1">
                  {emoji} <span className="font-['JetBrains_Mono'] text-[10px] text-[#5A6872]">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-[#1C2B36] rounded-lg p-3 border border-white/[0.06] text-center">
      <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
      <p className="font-['JetBrains_Mono'] text-[20px] font-semibold text-[#ECE8E1]">{value}</p>
      <p className="font-['Inter'] text-[10px] uppercase tracking-wider text-[#5A6872]">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="text-center">
      <p className="font-['JetBrains_Mono'] text-[16px] font-semibold text-[#ECE8E1]">
        {value !== null ? value.toFixed(1) : '—'}
      </p>
      <p className="font-['Inter'] text-[10px] uppercase tracking-wider text-[#5A6872]">{label}</p>
    </div>
  );
}
