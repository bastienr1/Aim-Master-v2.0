import { useState, useRef, useEffect } from 'react';
import { THEME_KIND_COLOR } from '@/constants/debrief-config';
import type { NoteKind } from '@/hooks/useScenarioNotes';

/** Order and wording of the classification control. Colours come from the theme kinds. */
const NOTE_KIND_OPTIONS: { value: NoteKind; label: string }[] = [
  { value: 'mechanics', label: 'Mechanics' },
  { value: 'mindset', label: 'Mindset' },
  { value: 'positive', label: 'Went well' },
];

interface ScenarioNoteEditorProps {
  scenarioName: string;
  note: string;
  onUpdate: (scenarioName: string, text: string) => void;
  saving: boolean;
  variant: 'card' | 'list';
  noteKind: NoteKind | null;
  onUpdateKind: (scenarioName: string, kind: NoteKind | null) => void;
}

export function ScenarioNoteEditor({
  scenarioName,
  note,
  onUpdate,
  saving,
  variant,
  noteKind,
  onUpdateKind,
}: ScenarioNoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState(note);

  useEffect(() => {
    setLocalValue(note);
  }, [note]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    onUpdate(scenarioName, e.target.value);
  };

  const isCard = variant === 'card';

  return (
    <div
      className={`
        ${isCard ? 'mt-3 px-1' : 'mt-2 w-full'}
        transition-all duration-200 ease-out
      `}
      style={{
        animation: 'noteSlideIn 200ms ease-out',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#53CADC"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.7 }}
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px',
              fontWeight: 500,
              color: '#53CADC',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              opacity: 0.8,
            }}
          >
            TECHNIQUE NOTE
          </span>
        </div>
        {saving && (
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '10px',
              color: '#5A6872',
              fontStyle: 'italic',
            }}
          >
            saving...
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        {NOTE_KIND_OPTIONS.map(({ value, label }) => {
          const isActive = noteKind === value;
          const color = THEME_KIND_COLOR[value];
          return (
            <button
              key={value}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateKind(scenarioName, isActive ? null : value);
              }}
              aria-pressed={isActive}
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '10px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '3px 9px',
                borderRadius: '999px',
                cursor: 'pointer',
                background: isActive ? `${color}1F` : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${isActive ? color : 'rgba(255, 255, 255, 0.10)'}`,
                color: isActive ? color : '#5A6872',
                transition: 'all 150ms ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        placeholder="e.g. Keep crosshair at target apex, loosen grip on direction changes..."
        rows={2}
        maxLength={500}
        style={{
          width: '100%',
          background: '#0F1923',
          border: '1px solid rgba(83, 202, 220, 0.15)',
          borderRadius: '8px',
          padding: '10px 12px',
          fontFamily: "'Inter', sans-serif",
          fontSize: '13px',
          lineHeight: '1.5',
          color: '#ECE8E1',
          resize: 'none',
          outline: 'none',
          transition: 'border-color 200ms ease',
          minHeight: isCard ? '64px' : '48px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(83, 202, 220, 0.35)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(83, 202, 220, 0.15)';
        }}
      />

      {localValue.length > 400 && (
        <div
          style={{
            textAlign: 'right',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '10px',
            color: localValue.length > 480 ? '#FF4655' : '#5A6872',
            marginTop: '4px',
          }}
        >
          {localValue.length}/500
        </div>
      )}
    </div>
  );
}
