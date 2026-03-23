import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { UnifiedSession } from '@/hooks/useUnifiedSessions';
import { getMoodLabel, getMoodKey } from '@/hooks/useUnifiedSessions';

const MOOD_COLORS: Record<string, string> = {
  fired: '#FF4655', neutral: '#53CADC', tilted: '#FFCA3A', drained: '#9b7aff', none: '#5A6872',
};

const INTENT_DISPLAY: Record<string, { label: string; color: string }> = {
  push_pr: { label: 'Push PRs', color: '#FF4655' },
  maintenance: { label: 'Maintain', color: '#53CADC' },
  improve: { label: 'Improve', color: '#53CADC' },
  warmup: { label: 'Warm-up', color: '#FFCA3A' },
};

function pipClass(level: number | null): string {
  if (level === null) return '';
  if (level >= 4) return 'bg-[#3DD598]/10 text-[#3DD598] border border-[#3DD598]/20';
  if (level === 3) return 'bg-[#FFCA3A]/[0.08] text-[#FFCA3A] border border-[#FFCA3A]/[0.18]';
  return 'bg-[#FF4655]/[0.08] text-[#FF4655] border border-[#FF4655]/[0.18]';
}

function qualColor(q: number | null): string {
  if (q === null) return '#5A6872';
  if (q >= 4) return '#3DD598';
  if (q === 3) return '#FFCA3A';
  return '#FF4655';
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function PipRing({ level }: { level: number | null }) {
  if (level === null) return null;
  return (
    <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center font-['JetBrains_Mono'] text-[10px] font-semibold ${pipClass(level)}`}>
      {level}
    </div>
  );
}

function QualityPips({ quality }: { quality: number | null }) {
  if (quality === null) return null;
  const color = qualColor(quality);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{
          backgroundColor: i <= quality ? color : 'rgba(255,255,255,0.06)',
          boxShadow: i <= quality ? `0 0 3px ${color}40` : 'none',
        }} />
      ))}
    </div>
  );
}

interface Props { session: UnifiedSession; defaultOpen?: boolean; }

export function UnifiedSessionCard({ session, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const moodKey = getMoodKey(session);
  const moodLabel = getMoodLabel(session);
  const moodColor = MOOD_COLORS[moodKey];
  const prCount = session.prs_detected.length;
  const hasCheckin = session.energy_level !== null || session.focus_level !== null || session.mood_level !== null;
  const intentCfg = session.session_intent ? INTENT_DISPLAY[session.session_intent] ?? { label: session.session_intent, color: '#53CADC' } : null;
  const scenNotes = session.scenario_notes?.filter(sn => sn.notes_text?.trim()) ?? [];
  const borderBg = moodKey === 'none' ? 'rgba(255,255,255,0.06)' : `linear-gradient(180deg, ${moodColor}, transparent 90%)`;

  return (
    <div className="bg-[#111B24] border border-white/[0.06] rounded-[14px] mb-2.5 overflow-hidden relative transition-colors duration-200 hover:border-white/[0.12]">
      <div className="absolute top-0 left-0 w-[3px] h-full" style={{ background: borderBg }} />

      {/* Collapsed header */}
      <div className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none hover:bg-white/[0.015] transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3.5">
          <span className="font-['JetBrains_Mono'] text-[11px] text-[#9CA8B3] min-w-[110px]">{fmtDate(session.created_at)}</span>
          {hasCheckin && (
            <div className="flex gap-1.5">
              <PipRing level={session.energy_level} />
              <PipRing level={session.focus_level} />
              <PipRing level={session.mood_level} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {prCount > 0 && (
            <span className="font-['JetBrains_Mono'] text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#FF4655]/10 text-[#FF4655] border border-[#FF4655]/15">PR</span>
          )}
          <span className="font-['Rajdhani'] text-[14px] font-bold lowercase tracking-wide" style={{ color: moodColor }}>{moodLabel}</span>
          <QualityPips quality={session.session_quality} />
          <ChevronDown className={`w-4 h-4 text-[#5A6872] transition-transform duration-[250ms] ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expandable body */}
      <div className="overflow-hidden transition-[max-height] duration-[350ms] ease-in-out" style={{ maxHeight: open ? '600px' : '0' }}>
        <div className="px-4 pb-3.5">

          {/* Check-in strip */}
          {hasCheckin && !session.checkin_skipped && (
            <div className="flex items-center gap-2.5 px-3 py-2 mb-2.5 bg-white/[0.02] border border-white/[0.04] rounded-lg">
              <span className="font-['Rajdhani'] text-[10px] font-semibold uppercase tracking-wider text-[#5A6872] whitespace-nowrap">Pre-session</span>
              <div className="flex gap-2 flex-1">
                {session.energy_level !== null && <div className="flex items-center gap-1"><PipRing level={session.energy_level} /><span className="text-[9px] text-[#5A6872] uppercase">Nrg</span></div>}
                {session.focus_level !== null && <div className="flex items-center gap-1"><PipRing level={session.focus_level} /><span className="text-[9px] text-[#5A6872] uppercase">Fcs</span></div>}
                {session.mood_level !== null && <div className="flex items-center gap-1"><PipRing level={session.mood_level} /><span className="text-[9px] text-[#5A6872] uppercase">Mood</span></div>}
              </div>
              {intentCfg && (
                <>
                  <div className="w-px h-3.5 bg-white/[0.06]" />
                  <span className="font-['Rajdhani'] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: `${intentCfg.color}15`, color: intentCfg.color }}>{intentCfg.label}</span>
                </>
              )}
            </div>
          )}

          {session.checkin_skipped && (
            <div className="px-3 py-1.5 mb-2.5 bg-white/[0.015] border border-white/[0.03] rounded-lg font-['JetBrains_Mono'] text-[10px] text-[#5A6872]">Check-in skipped</div>
          )}

          {!hasCheckin && !session.checkin_skipped && session.debrief_id && (
            <div className="px-3 py-1.5 mb-2.5 bg-white/[0.015] border border-white/[0.03] rounded-lg font-['JetBrains_Mono'] text-[10px] text-[#5A6872]">No check-in recorded</div>
          )}

          {/* PR banner */}
          {prCount > 0 && (
            <div className="flex items-center gap-2.5 px-3.5 py-2 mb-2.5 rounded-lg border border-[#FF4655]/[0.18]" style={{ background: 'linear-gradient(135deg, rgba(255,70,85,0.08), rgba(255,70,85,0.02))' }}>
              <div className="w-5 h-5 bg-[#FF4655]/10 rounded flex items-center justify-center text-[11px]">🏆</div>
              <span className="font-['Rajdhani'] text-[14px] font-bold text-[#FF4655]">{prCount} New PR{prCount !== 1 ? 's' : ''}</span>
              {Object.keys(session.categories).length > 0 && (
                <>
                  <div className="w-px h-3.5 bg-[#FF4655]/[0.12]" />
                  <span className="font-['JetBrains_Mono'] text-[10px] text-[#9CA8B3] bg-white/[0.04] px-1.5 py-0.5 rounded">{Object.keys(session.categories).join(', ')}</span>
                </>
              )}
            </div>
          )}

          {/* Theme chips */}
          {(session.primary_theme || session.secondary_theme) && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {session.primary_theme && <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#53CADC]/10 text-[#53CADC] border border-[#53CADC]/[0.22]">{session.primary_theme}</span>}
              {session.secondary_theme && <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/[0.03] text-[#9CA8B3] border border-white/[0.06]">{session.secondary_theme}</span>}
            </div>
          )}

          {/* Scenario notes */}
          {scenNotes.map((sn, i) => (
            <div key={i} className="px-3.5 py-2.5 mb-2 bg-[#53CADC]/[0.025] border-l-2 border-[#53CADC]/25 rounded-r-lg">
              <div className="font-['Rajdhani'] text-[12px] font-semibold text-[#53CADC] mb-1 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[#53CADC]" />{sn.scenario_name}
              </div>
              <div className="text-[12px] text-[#B0BEC5] leading-relaxed">{sn.notes_text}</div>
            </div>
          ))}

          {/* Reflection */}
          {session.freeform_text?.trim() && (
            <div className="px-3.5 py-2.5 mb-2 bg-[#FFCA3A]/[0.025] border-l-2 border-[#FFCA3A]/25 rounded-r-lg">
              <p className="text-[12px] text-[#FFCA3A] italic leading-relaxed opacity-90">"{session.freeform_text.trim()}"</p>
            </div>
          )}

          {/* Quality bar */}
          {session.session_quality !== null && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] text-[#5A6872] uppercase tracking-wider font-medium">Session</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-[22px] h-1 rounded-sm" style={{ backgroundColor: i <= session.session_quality! ? qualColor(session.session_quality) : 'rgba(255,255,255,0.04)' }} />
                ))}
              </div>
            </div>
          )}

          {session.type === 'checkin_only' && !session.checkin_skipped && (
            <p className="text-[11px] text-[#5A6872] italic pt-2">Session debrief not completed — reflection builds self-awareness.</p>
          )}
        </div>
      </div>
    </div>
  );
}
