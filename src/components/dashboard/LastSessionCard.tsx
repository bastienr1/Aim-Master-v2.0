import { useState, useEffect } from 'react';
import { Crosshair, Pencil, ArrowRight, Check, X } from 'lucide-react';
import { getThemeConfig, THEME_KIND_COLOR } from '@/constants/debrief-config';
import { SURFACE, TEXT, RADIUS, FONT, RED } from '@/constants/theme';
import type { LastDebriefRow } from '@/hooks/useLastDebrief';

const NEXT_INTENT_MAX = 140;

interface LastSessionCardProps {
  debrief: LastDebriefRow | null;
  loading: boolean;
  onUpdateNextIntent: (value: string | null) => void;
  onStartTraining: () => void;
}

/** "Wed - 19:42 - 34 min - 6 scenarios" */
function sessionMeta(debrief: LastDebriefRow): string {
  const start = new Date(debrief.session_start);
  const weekday = start.toLocaleDateString(undefined, { weekday: 'short' });
  const time = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const minutes = Math.max(1, Math.round(debrief.duration_seconds / 60));
  const count = debrief.scenario_count;
  const sep = '·';
  return `${weekday} ${sep} ${time} ${sep} ${minutes} min ${sep} ${count} ${count === 1 ? 'scenario' : 'scenarios'}`;
}

function ThemeChipReadonly({ themeId }: { themeId: string }) {
  const config = getThemeConfig(themeId);
  // An unknown theme id still renders - neutral, never guessed at.
  const color = THEME_KIND_COLOR[config?.kind ?? 'neutral'];
  return (
    <span
      style={{
        fontFamily: FONT.body,
        fontSize: '11px',
        padding: '3px 10px',
        borderRadius: RADIUS.chip,
        background: SURFACE.chip,
        border: `1px solid ${color}40`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {config?.label ?? themeId}
    </span>
  );
}

export function LastSessionCard({
  debrief,
  loading,
  onUpdateNextIntent,
  onStartTraining,
}: LastSessionCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft(debrief?.next_intent ?? '');
    setEditing(false);
  }, [debrief?.id, debrief?.next_intent]);

  const cardStyle: React.CSSProperties = {
    background: SURFACE.card,
    border: `1px solid ${SURFACE.cardBorder}`,
    borderRadius: RADIUS.card,
    padding: '18px',
  };

  if (loading) {
    return <div style={{ ...cardStyle, height: '340px' }} className="animate-pulse" />;
  }

  // No debrief yet - say so plainly rather than showing invented content.
  if (!debrief) {
    return (
      <div
        style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '260px',
        }}
      >
        <p
          style={{
            fontFamily: FONT.heading,
            fontSize: '18px',
            fontWeight: 600,
            color: TEXT.primary,
            marginBottom: '6px',
          }}
        >
          Your first debrief will appear here
        </p>
        <p
          style={{
            fontFamily: FONT.body,
            fontSize: '13px',
            color: TEXT.body,
            marginBottom: '16px',
            lineHeight: 1.6,
          }}
        >
          Train, then reflect. What you write after a session becomes the record this
          dashboard is built on.
        </p>
        <button
          onClick={onStartTraining}
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: FONT.body,
            fontSize: '13px',
            fontWeight: 600,
            color: RED,
            background: 'transparent',
            border: `1px solid ${RED}`,
            borderRadius: RADIUS.card,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          Start training <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  const notes = debrief.scenario_notes ?? [];

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <h2
          style={{
            fontFamily: FONT.heading,
            fontSize: '18px',
            fontWeight: 600,
            color: TEXT.primary,
            letterSpacing: '0.02em',
          }}
        >
          Last session
        </h2>
        <span style={{ fontFamily: FONT.mono, fontSize: '11px', color: TEXT.label }}>
          {sessionMeta(debrief)}
        </span>
      </div>

      {/* Theme + quality chips */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {debrief.primary_theme && <ThemeChipReadonly themeId={debrief.primary_theme} />}
        {debrief.secondary_theme && <ThemeChipReadonly themeId={debrief.secondary_theme} />}
        {debrief.session_quality !== null && (
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: RADIUS.chip,
              background: SURFACE.chip,
              border: `1px solid ${SURFACE.insetBorder}`,
              color: TEXT.body,
            }}
          >
            Quality {debrief.session_quality}/5
          </span>
        )}
      </div>

      {/* What the player wrote */}
      {debrief.freeform_text && (
        <div
          style={{
            background: SURFACE.inset,
            border: `1px solid ${SURFACE.insetBorder}`,
            borderRadius: RADIUS.card,
            padding: '12px 14px',
            marginBottom: '14px',
          }}
        >
          <p
            style={{
              fontFamily: FONT.body,
              fontSize: '13px',
              color: TEXT.primary,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}
          >
            {debrief.freeform_text}
          </p>
        </div>
      )}

      {/* Per-scenario notes */}
      {notes.length > 0 && (
        <div className="mb-4">
          <p
            style={{
              fontFamily: FONT.body,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: TEXT.label,
              marginBottom: '8px',
            }}
          >
            Scenario notes
          </p>
          <div className="flex flex-col gap-2">
            {notes.map((note, i) => {
              const tick = THEME_KIND_COLOR[note.note_kind ?? 'neutral'];
              return (
                <div key={`${note.scenario_name}-${i}`} style={{ display: 'flex', gap: '10px' }}>
                  <span
                    style={{
                      width: '3px',
                      flexShrink: 0,
                      background: tick,
                      borderRadius: '2px',
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        fontFamily: FONT.mono,
                        fontSize: '11px',
                        color: TEXT.primary,
                        marginBottom: '2px',
                      }}
                    >
                      {note.scenario_name}
                    </p>
                    <p
                      style={{
                        fontFamily: FONT.body,
                        fontSize: '12px',
                        color: TEXT.body,
                        lineHeight: 1.55,
                      }}
                    >
                      {note.notes_text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carry into today - the one red element on this card */}
      <div
        style={{
          background: 'rgba(255, 42, 42, 0.06)',
          borderLeft: `2px solid ${RED}`,
          borderRadius: RADIUS.card,
          padding: '10px 12px',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            style={{
              fontFamily: FONT.body,
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: RED,
            }}
          >
            Carry into today
          </span>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              title={debrief.next_intent ? 'Edit' : 'Add a carry-forward'}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: TEXT.label,
                display: 'flex',
                padding: 0,
              }}
            >
              <Pencil size={12} />
            </button>
          )}
        </div>

        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              maxLength={NEXT_INTENT_MAX}
              onChange={(e) => setDraft(e.target.value.slice(0, NEXT_INTENT_MAX))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateNextIntent(draft.trim() || null);
                  setEditing(false);
                } else if (e.key === 'Escape') {
                  setDraft(debrief.next_intent ?? '');
                  setEditing(false);
                }
              }}
              placeholder={'One thing to try next session…'}
              style={{
                flex: 1,
                minWidth: 0,
                background: SURFACE.inset,
                border: `1px solid ${SURFACE.insetBorder}`,
                borderRadius: RADIUS.input,
                padding: '6px 8px',
                fontFamily: FONT.body,
                fontSize: '13px',
                color: TEXT.primary,
                outline: 'none',
              }}
            />
            <button
              onClick={() => {
                onUpdateNextIntent(draft.trim() || null);
                setEditing(false);
              }}
              title="Save"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: RED,
                display: 'flex',
                padding: 0,
              }}
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setDraft(debrief.next_intent ?? '');
                setEditing(false);
              }}
              title="Cancel"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: TEXT.label,
                display: 'flex',
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : debrief.next_intent ? (
          <p
            style={{
              fontFamily: FONT.body,
              fontSize: '13px',
              color: TEXT.primary,
              lineHeight: 1.55,
            }}
          >
            {debrief.next_intent}
          </p>
        ) : (
          <button
            onClick={() => setEditing(true)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: FONT.body,
              fontSize: '13px',
              fontStyle: 'italic',
              color: TEXT.dim,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Crosshair size={12} /> Nothing carried forward &mdash; add one
          </button>
        )}
      </div>
    </div>
  );
}
