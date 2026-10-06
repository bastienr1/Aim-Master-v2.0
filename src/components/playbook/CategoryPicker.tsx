import { useEffect, useRef, useState } from 'react';
import { SURFACE, TEXT, RADIUS, FONT, SEMANTIC } from '@/constants/theme';
import {
  FAMILIES,
  FAMILY_LABEL,
  matchCategory,
  normaliseCategory,
  type CategoryOption,
} from '@/lib/drillCategories';

interface CategoryPickerProps {
  options: CategoryOption[];
  /** Seed categories matching the playbook's tags, listed first. */
  suggested: string[];
  current: string | null;
  onPick(category: string | null): void;
  onClose(): void;
}

const monoCaps: React.CSSProperties = {
  fontFamily: FONT.mono,
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: TEXT.dim,
};

/**
 * Inline category picker, no portal. Seed categories under their four family
 * headings, then the user's own, then a text field for a new one. Escape and a
 * click outside close it.
 */
export function CategoryPicker({ options, suggested, current, onPick, onClose }: CategoryPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      // The button that opened the picker closes it itself; closing here too would re-open it.
      if (target instanceof Element && target.closest('[data-category-trigger]')) return;
      if (ref.current && !ref.current.contains(target)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [onClose]);

  const byName = new Map(options.map((o) => [o.name, o]));
  const yours = options.filter((o) => !o.seed);
  const isCurrent = (name: string) => current !== null && current.toLowerCase() === name.toLowerCase();

  const submitDraft = () => {
    const name = normaliseCategory(draft);
    if (!name) return;
    onPick(matchCategory(name, options.map((o) => o.name)));
    setDraft('');
  };

  const chip = (name: string) => {
    const option = byName.get(name);
    const active = isCurrent(name);
    return (
      <button
        key={name}
        type="button"
        onClick={() => onPick(name)}
        aria-pressed={active}
        style={{
          background: active ? SURFACE.chip : 'transparent',
          border: `1px solid ${active ? SEMANTIC.mechanics : SURFACE.insetBorder}`,
          borderRadius: RADIUS.chip,
          padding: '3px 9px',
          cursor: 'pointer',
          fontFamily: FONT.body,
          fontSize: '11.5px',
          lineHeight: 1.4,
          color: active ? TEXT.primary : TEXT.body,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        {name}
        {option && option.count > 0 && (
          <span style={{ fontFamily: FONT.mono, fontSize: '10px', color: TEXT.dim }}>{option.count}</span>
        )}
      </button>
    );
  };

  const section = (label: string, names: string[]) =>
    names.length > 0 && (
      <div key={label} style={{ display: 'grid', gap: '5px' }}>
        <span style={monoCaps}>{label}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>{names.map(chip)}</div>
      </div>
    );

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Category"
      data-category-picker
      style={{
        marginTop: '8px',
        padding: '10px',
        background: SURFACE.card,
        border: `1px solid ${SURFACE.insetBorder}`,
        borderRadius: RADIUS.card,
        display: 'grid',
        gap: '10px',
      }}
    >
      {section('Suggested', suggested)}
      {FAMILIES.map((family) =>
        section(
          FAMILY_LABEL[family],
          options.filter((o) => o.seed && o.family === family).map((o) => o.name),
        ),
      )}
      {section('Yours', yours.map((o) => o.name))}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {current !== null && (
          <button
            type="button"
            onClick={() => onPick(null)}
            style={{
              background: 'transparent',
              border: `1px dashed ${SURFACE.insetBorder}`,
              borderRadius: RADIUS.chip,
              padding: '3px 9px',
              cursor: 'pointer',
              fontFamily: FONT.body,
              fontSize: '11.5px',
              color: TEXT.label,
            }}
          >
            No category
          </button>
        )}
        <input
          type="text"
          aria-label="New category"
          placeholder="New category"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitDraft();
            }
          }}
          style={{
            flex: '1 1 140px',
            minWidth: 0,
            background: SURFACE.inset,
            border: `1px solid ${SURFACE.insetBorder}`,
            borderRadius: RADIUS.input,
            padding: '4px 8px',
            fontFamily: FONT.body,
            fontSize: '12px',
            color: TEXT.primary,
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
