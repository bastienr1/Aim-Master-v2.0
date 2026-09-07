import { useState, useEffect } from 'react';
import { Crosshair, Pencil, ArrowRight, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import { getThemeConfig, THEME_KIND_COLOR } from '@/constants/debrief-config';
import { SURFACE, TEXT, RADIUS, FONT, RED, SEMANTIC } from '@/constants/theme';
import type { LastDebriefRow } from '@/hooks/useDebriefHistory';

const NEXT_INTENT_MAX = 140;

/** Below this a duration is noise, not information. */
const MIN_MEANINGFUL_DURATION_S = 120;

interface LogbookCardProps {
  current: LastDebriefRow | null;
  index: number;
  total: number;
  hasPrev: boolean;
  hasNext: boolean;
  loading: boolean;
  onPrev(): void;
  onNext(): void;
  onUpdateNextIntent(id: string, value: string | null): void;
  onStartTraining(): void;
  onNavigate(tab: string): void;
}

/**
 * "Mon 07 Sep · 06:17 · 3 scenarios".
 * The scenario count comes from the notes list, not scenario_count — the column
 * disagreed with the body and printed "0 scenarios" above a non-empty list.
 */
function sessionMeta(debrief: LastDebriefRow): string {
  const start = new Date(debrief.session_start);
  const parts = [
    start.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' }),
    start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  ];

  if (debrief.duration_seconds >= MIN_MEANINGFUL_DURATION_S) {
    parts.push(`${Math.round(debrief.duration_seconds / 60)} min`);
  }

  const count = debrief.scenario_notes.length;
  parts.push(`${count} ${count === 1 ? 'scenario' : 'scenarios'}`);
  return parts.join(' · ');
}

function ThemeChipReadonly({ themeId }: { themeId: string }) {
  const config = getThemeConfig(themeId);
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

function NavButton({
  dir,
  disabled,
  onClick,
}: {
  dir: 'prev' | 'next';
  disabled: boolean;
  onClick(): void;
}) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Older session' : 'Newer session'}
      style={{
        width: '32px',
        height: '32px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: `1px solid ${SURFACE.insetBorder}`,
        borderRadius: RADIUS.card,
        color: disabled ? TEXT.dim : TEXT.body,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <Icon size={15} />
    </button>
  );
}

export function LogbookCard({
  current,
  index,
  total,
  hasPrev,
  hasNext,
  loading,
  onPrev,
  onNext,
  onUpdateNextIntent,
  onStartTraining,
  onNavigate,
}: LogbookCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    setDraft(current?.next_intent ?? '');
    setEditing(false);
    setExpanded(new Set());
  }, [current?.id, current?.next_intent]);

  const cardStyle: React.CSSProperties = {
    background: SURFACE.card,
    border: `1px solid ${SURFACE.cardBorder}`,
    borderTop: `2px solid ${SEMANTIC.mindset}`,
    borderRadius: RADIUS.card,
    padding: '18px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    height: '100%',
  };

  if (loading) {
    return <div style={{ ...cardStyle, minHeight: '340px' }} className="animate-pulse" />;
  }

  if (!current) {
    return (
      <div style={cardStyle}>
        <SectionTitle label="Logbook" color={SEMANTIC.mindset} />
        <div style={{ margin: 'auto 0', textAlign: 'center' }}>
          <p style={{ fontFamily: FONT.heading, fontSize: '17px', fontWeight: 600, color: TEXT.primary, marginBottom: '6px' }}>
            Your first debrief will appear here
          </p>
          <p style={{ fontFamily: FONT.body, fontSize: '13px', color: TEXT.body, lineHeight: 1.6, marginBottom: '14px' }}>
            Train, then reflect. What you write after a session becomes the record this
            dashboard is built on.
          </p>
          <button
            onClick={onStartTraining}
            style={{
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
      </div>
    );
  }

  const notes = current.scenario_notes;

  return (
    <div style={cardStyle}>
      <div>
        <SectionTitle label="Logbook" color={SEMANTIC.mindset} />

        {/* Day navigator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
          <NavButton dir="prev" disabled={!hasPrev} onClick={onPrev} />
          <span style={{ fontFamily: FONT.mono, fontSize: '11px', color: TEXT.body, textAlign: 'center' }}>
            {sessionMeta(current)}
          </span>
          <NavButton dir="next" disabled={!hasNext} onClick={onNext} />
        </div>
        <p style={{ fontFamily: FONT.mono, fontSize: '10px', color: TEXT.dim, textAlign: 'center', marginTop: '5px' }}>
          Browse the last 30 days · {index + 1} of {total}
        </p>
      </div>

      {/* Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {current.primary_theme && <ThemeChipReadonly themeId={current.primary_theme} />}
        {current.secondary_theme && <ThemeChipReadonly themeId={current.secondary_theme} />}
        {current.session_quality !== null && (
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
            Quality {current.session_quality}/5
          </span>
        )}
      </div>

      {current.freeform_text && (
        <div
          style={{
            background: SURFACE.inset,
            border: `1px solid ${SURFACE.insetBorder}`,
            borderRadius: RADIUS.card,
            padding: '12px 14px',
          }}
        >
          <p style={{ fontFamily: FONT.body, fontSize: '13px', color: TEXT.primary, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {current.freeform_text}
          </p>
        </div>
      )}

      {notes.length > 0 && (
        <div>
          <p
            style={{
              fontFamily: FONT.mono,
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: TEXT.dim,
              marginBottom: '8px',
            }}
          >
            Scenario notes
          </p>
          <div className="flex flex-col gap-2">
            {notes.map((note, i) => {
              const tick = THEME_KIND_COLOR[note.note_kind ?? 'neutral'];
              const isOpen = expanded.has(i);
              return (
                <div
                  key={`${note.scenario_name}-${i}`}
                  onClick={() =>
                    setExpanded((prev) => {
                      const nextSet = new Set(prev);
                      if (nextSet.has(i)) nextSet.delete(i);
                      else nextSet.add(i);
                      return nextSet;
                    })
                  }
                  style={{ display: 'flex', gap: '10px', cursor: 'pointer' }}
                >
                  <span style={{ width: '3px', flexShrink: 0, background: tick, borderRadius: '2px' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontFamily: FONT.mono, fontSize: '11px', color: TEXT.primary, marginBottom: '2px' }}>
                      {note.scenario_name}
                    </p>
                    <p
                      style={{
                        fontFamily: FONT.body,
                        fontSize: '12px',
                        color: TEXT.body,
                        lineHeight: 1.55,
                        ...(isOpen
                          ? {}
                          : {
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical' as const,
                              overflow: 'hidden',
                            }),
                      }}
                    >
                      {note.notes_text}
                    </p>
                  </div>
                  <ChevronRight
                    size={13}
                    style={{
                      flexShrink: 0,
                      color: TEXT.dim,
                      marginTop: '1px',
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                      transition: 'transform 150ms ease',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carry into today — Home is this field's only surface, so it lives here */}
      <div
        style={{
          background: SURFACE.inset,
          border: `1px dashed ${SURFACE.insetBorder}`,
          borderRadius: RADIUS.card,
          padding: '10px 12px',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: RED,
            }}
          >
            Carry into today
          </span>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              title={current.next_intent ? 'Edit' : 'Add a carry-forward'}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT.label, display: 'flex', padding: 0 }}
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
                  onUpdateNextIntent(current.id, draft.trim() || null);
                  setEditing(false);
                } else if (e.key === 'Escape') {
                  setDraft(current.next_intent ?? '');
                  setEditing(false);
                }
              }}
              placeholder={'One thing to try next session…'}
              style={{
                flex: 1,
                minWidth: 0,
                background: SURFACE.card,
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
                onUpdateNextIntent(current.id, draft.trim() || null);
                setEditing(false);
              }}
              title="Save"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: RED, display: 'flex', padding: 0 }}
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setDraft(current.next_intent ?? '');
                setEditing(false);
              }}
              title="Cancel"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: TEXT.label, display: 'flex', padding: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        ) : current.next_intent ? (
          <p style={{ fontFamily: FONT.body, fontSize: '13px', color: TEXT.primary, lineHeight: 1.55 }}>
            {current.next_intent}
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

      {/* Footer */}
      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: `1px solid ${SURFACE.cardBorder}` }}>
        <button
          onClick={() => onNavigate('sessions')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: FONT.mono,
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TEXT.label,
          }}
        >
          All sessions <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}
