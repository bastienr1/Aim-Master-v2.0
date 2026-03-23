import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UnifiedSession } from '@/hooks/useUnifiedSessions';
import { getMoodKey, getMoodLabel } from '@/hooks/useUnifiedSessions';

const MOOD_DOT: Record<string, string> = {
  fired: '#FF4655', neutral: '#53CADC', tilted: '#FFCA3A', drained: '#9b7aff', none: 'rgba(255,255,255,0.10)',
};
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

interface Props { sessions: UnifiedSession[]; }

export function SessionCalendarView({ sessions }: Props) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const byDate = useMemo(() => {
    const m = new Map<string, UnifiedSession>();
    for (const s of sessions) {
      const k = toKey(new Date(s.created_at));
      const ex = m.get(k);
      if (!ex || (s.debrief_id && !ex.debrief_id)) m.set(k, s);
    }
    return m;
  }, [sessions]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCur = today.getMonth() === month && today.getFullYear() === year;

  function nav(dir: number) {
    let m = month + dir, y = year;
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    setMonth(m); setYear(y);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => nav(-1)} className="w-[30px] h-[30px] rounded-lg border border-white/[0.06] bg-transparent text-[#9CA8B3] flex items-center justify-center cursor-pointer hover:border-white/[0.12] hover:text-[#ECE8E1] transition-all">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="font-['Rajdhani'] text-lg font-bold text-[#ECE8E1]">{MONTHS[month]} {year}</span>
        <button onClick={() => nav(1)} className="w-[30px] h-[30px] rounded-lg border border-white/[0.06] bg-transparent text-[#9CA8B3] flex items-center justify-center cursor-pointer hover:border-white/[0.12] hover:text-[#ECE8E1] transition-all">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map(d => (
          <div key={d} className="font-['JetBrains_Mono'] text-[9px] font-medium text-[#5A6872] text-center py-1 pb-2 uppercase tracking-wider">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const k = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const s = byDate.get(k);
          const isToday = isCur && day === today.getDate();
          const isFuture = isCur && day > today.getDate();
          const mk = s ? getMoodKey(s) : null;
          const hasPr = s ? s.prs_detected.length > 0 : false;

          return (
            <div key={day} className={`aspect-square rounded-[10px] flex flex-col items-center justify-center gap-1 bg-white/[0.015] border border-white/[0.03] transition-all ${isToday ? 'border-[#53CADC]/30' : ''} ${isFuture ? 'opacity-25' : ''} ${s ? 'cursor-pointer hover:border-white/[0.12] hover:bg-white/[0.03] hover:scale-[1.04]' : ''}`}
              title={s ? `${getMoodLabel(s)}${s.session_quality ? ` · Quality: ${s.session_quality}/5` : ''}${hasPr ? ' · PR!' : ''}` : ''}
            >
              <span className={`font-['JetBrains_Mono'] text-[12px] font-medium ${isToday ? 'text-[#53CADC]' : 'text-[#9CA8B3]'}`}>{day}</span>
              {s && (
                <div className="flex items-center gap-0.5">
                  <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: MOOD_DOT[mk ?? 'none'], boxShadow: mk && mk !== 'none' ? `0 0 5px ${MOOD_DOT[mk]}50` : 'none' }} />
                  {hasPr && <div className="w-[5px] h-[5px] rounded-full bg-[#FF4655]" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-4 pt-3 border-t border-white/[0.06]">
        {(['fired','neutral','tilted','drained'] as const).map(m => (
          <div key={m} className="flex items-center gap-1.5">
            <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: MOOD_DOT[m] }} />
            <span className="text-[10px] text-[#5A6872]">{m === 'fired' ? 'Fired up' : m.charAt(0).toUpperCase() + m.slice(1)}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-[5px] h-[5px] rounded-full bg-[#FF4655]" />
          <span className="text-[10px] text-[#5A6872]">PR</span>
        </div>
      </div>
    </div>
  );
}
