import { useState } from 'react';
import { Brain } from 'lucide-react';
import { useSessionNotes, SessionNote } from '../../hooks/useSessionNotes';

function getBorderColor(quality: number | null): string {
  if (quality === null) return '#5A6872';
  if (quality >= 4) return '#3DD598';
  if (quality === 3) return '#FFCA3A';
  return '#FF4655';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

function QualityDots({ quality }: { quality: number | null }) {
  if (quality === null) return null;
  return (
    <div className="flex gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: i <= quality ? '#FFCA3A' : '#2A3A47' }}
        />
      ))}
    </div>
  );
}

function SessionNoteCard({ note }: { note: SessionNote }) {
  const [expanded, setExpanded] = useState(false);

  const borderColor = getBorderColor(note.session_quality);
  const date = formatDate(note.created_at);
  const duration = formatDuration(note.duration_seconds);
  const prCount = Array.isArray(note.prs_detected) ? note.prs_detected.length : 0;
  const categoryKeys = note.categories ? Object.keys(note.categories) : [];
  const hasFreeform = !!note.freeform_text?.trim();
  const freeformText = note.freeform_text?.trim() || '';
  const isLong = freeformText.length > 120;
  const displayText = expanded || !isLong ? freeformText : freeformText.slice(0, 120) + '...';

  // Build meta items
  const metaItems: string[] = [date];
  if (duration) metaItems.push(duration);
  if (note.scenario_count && note.scenario_count > 0) {
    metaItems.push(`${note.scenario_count} scenario${note.scenario_count !== 1 ? 's' : ''}`);
  }

  return (
    <div
      className="bg-[#1C2B36] rounded-lg p-4 mb-2 border-l-4"
      style={{ borderLeftColor: borderColor }}
    >
      {/* Line 1 — Meta row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-['Inter'] text-xs text-[#5A6872] truncate">
          {metaItems.join(' \u00B7 ')}
        </span>
        {note.emoji_reaction && (
          <span className="text-base shrink-0">{note.emoji_reaction}</span>
        )}
      </div>

      {/* Line 2 — Themes + Quality */}
      {(note.primary_theme || note.secondary_theme || note.session_quality !== null) && (
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {note.primary_theme && (
              <span className="bg-[#33454F] rounded-full px-3 py-1 font-['Inter'] text-[11px] text-[#ECE8E1] whitespace-nowrap">
                {note.primary_theme}
              </span>
            )}
            {note.secondary_theme && (
              <span className="bg-[#2A3A47] rounded-full px-3 py-1 font-['Inter'] text-[11px] text-[#ECE8E1] whitespace-nowrap">
                {note.secondary_theme}
              </span>
            )}
          </div>
          <QualityDots quality={note.session_quality} />
        </div>
      )}

      {/* Line 3 — PRs + Categories */}
      {(prCount > 0 || categoryKeys.length > 0) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {prCount > 0 && (
            <span className="font-['Inter'] text-[11px] text-[#3DD598]">
              🏆 {prCount} PR{prCount !== 1 ? 's' : ''}
            </span>
          )}
          {prCount > 0 && categoryKeys.length > 0 && (
            <span className="text-[#5A6872] text-[11px]">&middot;</span>
          )}
          {categoryKeys.length > 0 && (
            <span className="font-['Inter'] text-[11px] text-[#5A6872]">
              {categoryKeys.join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Line 4 — Freeform text */}
      {hasFreeform && (
        <div className="mt-2.5 pl-2 border-l-2 border-[#2A3A47]">
          <p className="font-['Inter'] text-[13px] text-[#9CA8B3] italic leading-relaxed">
            "{displayText}"
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="font-['Inter'] text-[11px] text-[#53CADC] bg-transparent border-none cursor-pointer mt-1 p-0 hover:underline"
            >
              {expanded ? 'show less' : 'show more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-[#1C2B36] rounded-lg p-4 mb-2 border-l-4 border-[#5A6872] animate-pulse">
      <div className="w-48 h-3 rounded bg-white/5 mb-3" />
      <div className="flex gap-2 mb-3">
        <div className="w-24 h-5 rounded-full bg-white/5" />
        <div className="w-20 h-5 rounded-full bg-white/5" />
      </div>
      <div className="w-64 h-3 rounded bg-white/5" />
    </div>
  );
}

export function SessionNotes() {
  const { notes, loading, totalCount } = useSessionNotes(5);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
            Session Notes
          </h2>
          <p className="text-[13px] font-['Inter'] text-[#5A6872] mt-0.5">
            Post-training reflections
          </p>
        </div>
        {!loading && totalCount > 5 && (
          <span className="text-[12px] font-['Inter'] text-[#5A6872]">
            Showing 5 of {totalCount}
          </span>
        )}
      </div>

      {loading ? (
        <div>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="bg-[#1C2B36] rounded-lg p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-[#0F1923] flex items-center justify-center mx-auto mb-3">
            <Brain className="w-5 h-5 text-[#5A6872]" />
          </div>
          <p className="font-['Inter'] text-sm text-[#5A6872]">
            Complete your first session debrief to see notes here
          </p>
        </div>
      ) : (
        <div>
          {notes.map((note) => (
            <SessionNoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
