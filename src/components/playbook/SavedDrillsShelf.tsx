import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Play, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatTimestamp } from '@/lib/playbookParser';
import { SURFACE, TEXT, RADIUS, FONT, SEMANTIC } from '@/constants/theme';
import { UNCATEGORISED, categoryOptions, groupByCategory } from '@/lib/drillCategories';
import { goalCountBySave, snapshotChanged } from '@/lib/savedDrills';
import { useSavedDrills } from '@/hooks/useSavedDrills';
import { CategoryPicker } from './CategoryPicker';
import type { SavedDrill } from '@/types/playbook';

interface SavedDrillsShelfProps {
  /** Opens the playbook at the drill's source moment with the drill marked. */
  onOpen(playbookId: string, seconds: number, drillId: string | null): void;
}

const monoCaps: React.CSSProperties = {
  fontFamily: FONT.mono,
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
};

const plainButton: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left',
  color: 'inherit',
  font: 'inherit',
};

/** Live titles of the saved drills' source rows, one query. Missing ids are drills a re-sync deleted. */
function useLiveTitles(saved: SavedDrill[]): Map<string, string> {
  // The sorted id list as one string, so the same ids never re-run the query.
  const key = useMemo(
    () => saved.map((s) => s.drill_id).filter((id): id is string => id !== null).sort().join(','),
    [saved],
  );
  const [titles, setTitles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const ids = key === '' ? [] : key.split(',');
    if (ids.length === 0) {
      setTitles(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('playbook_drills').select('id, title').in('id', ids);
      if (cancelled) return;
      if (error) {
        console.error('Failed to load live drill titles:', error);
        return;
      }
      setTitles(new Map((data ?? []).map((row) => [row.id as string, row.title as string])));
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return titles;
}

/** Every save, category first, at the top of the reader's library. */
export function SavedDrillsShelf({ onOpen }: SavedDrillsShelfProps) {
  const { saved, links, setCategory, removeSavedDrill } = useSavedDrills();
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const liveTitles = useLiveTitles(saved);

  if (saved.length === 0) return null;

  const options = categoryOptions(saved);
  const goalCounts = goalCountBySave(links);
  const groups = groupByCategory(saved);

  const remove = async (item: SavedDrill) => {
    const count = await removeSavedDrill(item.id);
    if (count > 0) toast(`Removed. Unlinked from ${count} goal${count === 1 ? '' : 's'}.`);
  };

  return (
    <section aria-label="Saved drills" style={{ padding: '14px 20px 4px', maxWidth: '860px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
        <h3 style={{ fontFamily: FONT.heading, fontSize: '18px', fontWeight: 600, textTransform: 'uppercase', color: TEXT.primary, margin: 0 }}>
          Saved drills
        </h3>
        <span style={{ fontFamily: FONT.mono, fontSize: '12px', color: TEXT.label }}>{saved.length}</span>
      </div>

      {groups.map(([category, items]) => (
        <div key={category ?? '__none'} style={{ marginBottom: '14px' }}>
          <p style={{ ...monoCaps, color: TEXT.label, marginBottom: '8px' }}>
            {category ?? UNCATEGORISED} <span style={{ color: TEXT.dim }}>{items.length}</span>
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {items.map((item) => {
              const canJump = item.playbook_id !== null && item.source_start_seconds !== null;
              const linked = goalCounts.get(item.id) ?? 0;
              const live = item.drill_id ? liveTitles.get(item.drill_id) ?? null : null;
              return (
                <li key={item.id} style={{ background: SURFACE.card, border: `1px solid ${SURFACE.cardBorder}`, borderRadius: RADIUS.card, padding: '11px 12px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <p style={{ flex: 1, minWidth: 0, fontFamily: FONT.body, fontSize: '13.5px', fontWeight: 600, color: TEXT.primary, lineHeight: 1.4, margin: 0 }}>{item.title}</p>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      title="Remove saved drill"
                      style={{ ...plainButton, color: TEXT.dim, display: 'inline-flex', flexShrink: 0, padding: '2px', margin: '-2px' }}
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                    <button
                      type="button"
                      data-category-trigger
                      onClick={() => setPickerFor(pickerFor === item.id ? null : item.id)}
                      title="Change category"
                      style={{
                        background: item.category ? SURFACE.chip : 'transparent',
                        border: `1px ${item.category ? 'solid' : 'dashed'} ${SURFACE.insetBorder}`,
                        borderRadius: RADIUS.chip,
                        padding: '2px 8px',
                        cursor: 'pointer',
                        fontFamily: FONT.body,
                        fontSize: '11px',
                        color: item.category ? TEXT.body : TEXT.dim,
                      }}
                    >
                      {item.category ?? 'Add category'}
                    </button>
                    {linked > 0 && (
                      <span style={{ fontFamily: FONT.mono, fontSize: '10px', color: TEXT.label }}>
                        Used in {linked} goal{linked === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>

                  {pickerFor === item.id && (
                    <CategoryPicker
                      options={options}
                      suggested={[]}
                      current={item.category}
                      onPick={(category) => {
                        setCategory(item.id, category);
                        setPickerFor(null);
                      }}
                      onClose={() => setPickerFor(null)}
                    />
                  )}

                  <dl style={{ margin: 0, display: 'grid', gap: '3px', fontSize: '12px', lineHeight: 1.5 }}>
                    {item.scenario && <Row term="Scenario" value={item.scenario} mono />}
                    {item.venue && <Row term="Where" value={item.venue} />}
                    {item.cue && <Row term="Watch for" value={item.cue} />}
                    {item.success_signal && <Row term="Success" value={item.success_signal} />}
                  </dl>

                  {snapshotChanged(item, live) && (
                    <p style={{ margin: 0, fontFamily: FONT.body, fontSize: '11px', color: TEXT.dim }}>Note changed since saved</p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 'auto', paddingTop: '2px', minWidth: 0 }}>
                    {item.source_title && (
                      <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.body, fontSize: '11px', color: TEXT.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.source_title}>
                        {item.source_title}
                      </span>
                    )}
                    {canJump && (
                      <button
                        type="button"
                        onClick={() => onOpen(item.playbook_id as string, item.source_start_seconds as number, item.drill_id)}
                        title="Open the playbook where this drill comes from"
                        style={{ ...plainButton, display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: FONT.mono, fontSize: '10.5px', color: SEMANTIC.mechanics, whiteSpace: 'nowrap', marginLeft: 'auto' }}
                      >
                        <Play size={10} />
                        {formatTimestamp(item.source_start_seconds as number)}
                        {item.source_end_seconds !== null && ` – ${formatTimestamp(item.source_end_seconds)}`}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}

function Row({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <dt style={{ ...monoCaps, fontSize: '9px', color: TEXT.dim, minWidth: '66px', paddingTop: '3px' }}>{term}</dt>
      <dd style={{ margin: 0, minWidth: 0, color: mono ? TEXT.primary : TEXT.body, fontFamily: mono ? FONT.mono : FONT.body, fontSize: mono ? '11.5px' : undefined }}>{value}</dd>
    </div>
  );
}
