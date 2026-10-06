import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { ArrowLeft, CornerDownRight, Crosshair, Play, VideoOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePlaybookDetail } from '@/hooks/usePlaybooks';
import { useSavedDrills } from '@/hooks/useSavedDrills';
import { extractYouTubeId, formatTimestamp } from '@/lib/playbookParser';
import { linkifyTimestamps, TIMESTAMP_HREF_PREFIX } from '@/lib/playbookMoments';
import { categoryOptions, suggestedCategories, type CategoryOption } from '@/lib/drillCategories';
import { SURFACE, TEXT, RADIUS, FONT, SEMANTIC } from '@/constants/theme';
import { SaveDrillButton } from './SaveDrillButton';
import { CategoryPicker } from './CategoryPicker';
import { SavedDrillsShelf } from './SavedDrillsShelf';
import type { PlaybookChapter, PlaybookDetail, PlaybookDrill, PlaybookSummary, SavedDrill } from '@/types/playbook';

// ─── Shared bits ──────────────────────────────────────────────────────────

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

/** Amber by default: a technique note is mechanics unless it says otherwise. */
function kindColorOf(playbook: Pick<PlaybookSummary, 'kind'>): string {
  return playbook.kind === 'mindset' ? SEMANTIC.mindset : SEMANTIC.mechanics;
}

const range = (start: number, end: number) => `${formatTimestamp(start)} – ${formatTimestamp(end)}`;

// ─── Notes markdown ───────────────────────────────────────────────────────

function Timestamp({ seconds, onJump, children }: { seconds: number; onJump(seconds: number): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => onJump(seconds)}
      title={`Jump to ${formatTimestamp(seconds)}`}
      style={{ ...plainButton, fontFamily: FONT.mono, fontSize: '0.86em', color: TEXT.label, textDecoration: 'underline', textUnderlineOffset: '3px' }}
    >
      {children}
    </button>
  );
}

function NotesMarkdown({ markdown, onJump }: { markdown: string; onJump(seconds: number): void }) {
  const components: Components = {
    // The note's `#### situation [a–b]` headings arrive here as h4.
    h1: ({ children }) => <h4 style={headingStyle}>{children}</h4>,
    h2: ({ children }) => <h4 style={headingStyle}>{children}</h4>,
    h3: ({ children }) => <h4 style={headingStyle}>{children}</h4>,
    h4: ({ children }) => <h4 style={headingStyle}>{children}</h4>,
    p: ({ children }) => <p style={{ margin: '0 0 10px' }}>{children}</p>,
    ul: ({ children }) => <ul style={{ margin: '0 0 10px', paddingLeft: '18px', listStyle: 'disc' }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: '0 0 10px', paddingLeft: '18px', listStyle: 'decimal' }}>{children}</ol>,
    li: ({ children }) => <li style={{ marginBottom: '4px' }}>{children}</li>,
    strong: ({ children }) => <strong style={{ fontWeight: 600, color: TEXT.primary }}>{children}</strong>,
    hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${SURFACE.cardBorder}`, margin: '14px 0' }} />,
    code: ({ children }) => (
      <code style={{ fontFamily: FONT.mono, fontSize: '12px', background: SURFACE.inset, border: `1px solid ${SURFACE.insetBorder}`, borderRadius: '4px', padding: '1px 5px' }}>
        {children}
      </code>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '0 0 12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{ textAlign: 'left', fontWeight: 600, color: TEXT.primary, borderBottom: `1px solid ${SURFACE.insetBorder}`, padding: '6px 8px' }}>{children}</th>
    ),
    td: ({ children }) => (
      <td style={{ verticalAlign: 'top', borderBottom: `1px solid ${SURFACE.cardBorder}`, padding: '6px 8px' }}>{children}</td>
    ),
    a: ({ href, children }) => {
      if (href?.startsWith(TIMESTAMP_HREF_PREFIX)) {
        return (
          <Timestamp seconds={Number(href.slice(TIMESTAMP_HREF_PREFIX.length))} onJump={onJump}>
            {children}
          </Timestamp>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: TEXT.primary, textDecoration: 'underline', textUnderlineOffset: '3px' }}>
          {children}
        </a>
      );
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {linkifyTimestamps(markdown)}
    </ReactMarkdown>
  );
}

const headingStyle: React.CSSProperties = {
  fontFamily: FONT.body,
  fontSize: '13.5px',
  fontWeight: 600,
  color: TEXT.primary,
  margin: '16px 0 6px',
};

// ─── Library (no playbook picked) ─────────────────────────────────────────

interface LibraryProps {
  playbooks: PlaybookSummary[];
  onPick(id: string): void;
  /** From the Saved drills shelf: open a playbook at a drill's source moment. */
  onOpenDrill(playbookId: string, seconds: number, drillId: string | null): void;
}

function Library({ playbooks, onPick, onOpenDrill }: LibraryProps) {
  const shelf = <SavedDrillsShelf onOpen={onOpenDrill} />;

  if (playbooks.length === 0) {
    return (
      <>
        {shelf}
        <p style={{ fontFamily: FONT.body, fontSize: '13px', color: TEXT.body, lineHeight: 1.6, padding: '24px 20px' }}>
          No playbooks synced yet &mdash; a playbook is a vault note with timed chapters. Run{' '}
          <code style={{ fontFamily: FONT.mono, fontSize: '12px', color: TEXT.primary }}>npm run sync-playbooks</code>
        </p>
      </>
    );
  }

  return (
    <>
      {shelf}
      <ul style={{ listStyle: 'none', margin: 0, padding: '12px 20px 24px', display: 'grid', gap: '10px', maxWidth: '860px' }}>
        {playbooks.map((playbook) => (
          <li key={playbook.id}>
            <button
              type="button"
              onClick={() => onPick(playbook.id)}
              style={{
                ...plainButton,
                display: 'block',
                width: '100%',
                background: SURFACE.card,
                border: `1px solid ${SURFACE.cardBorder}`,
                borderLeft: `2px solid ${kindColorOf(playbook)}`,
                borderRadius: RADIUS.card,
                padding: '14px 16px',
              }}
            >
              <span style={{ ...monoCaps, fontSize: '9.5px', color: kindColorOf(playbook) }}>
                {playbook.kind ?? 'technique'}
                {playbook.creator && <span style={{ color: TEXT.dim }}> · {playbook.creator}</span>}
              </span>
              <span
                style={{ display: 'block', fontFamily: FONT.heading, fontSize: '18px', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.2, color: TEXT.primary, margin: '4px 0 6px' }}
              >
                {playbook.title}
              </span>
              <span style={{ fontFamily: FONT.mono, fontSize: '11px', color: TEXT.label }}>
                {playbook.chapter_count} chapters · {playbook.moment_count} moments
                {playbook.video_duration_seconds != null && ` · ${formatTimestamp(playbook.video_duration_seconds)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

// ─── One playbook ─────────────────────────────────────────────────────────

type Tab = 'notes' | 'takeaways' | 'drills';

interface PlaybookViewProps {
  playbook: PlaybookSummary;
  detail: PlaybookDetail;
  loading: boolean;
  /** Opens on the Drills tab, jumps the video here once and marks `initialDrillId`. */
  initialSeconds?: number | null;
  initialDrillId?: string | null;
}

/** Chapter list + video + notes for one playbook. Playbook data comes in as props; saves come from the shared store. */
export function PlaybookView({ playbook, detail, loading, initialSeconds = null, initialDrillId = null }: PlaybookViewProps) {
  const { chapters, moments, drills } = detail;
  const accent = kindColorOf(playbook);
  const openOnDrill = initialSeconds !== null || initialDrillId !== null;

  const [activeNumber, setActiveNumber] = useState<number | null>(null);
  // `nonce` changes on every jump so re-clicking the same moment restarts the video there.
  const [jump, setJump] = useState<{ seconds: number | null; nonce: number }>({ seconds: null, nonce: 0 });
  const [tab, setTab] = useState<Tab>(openOnDrill ? 'drills' : 'notes');

  // Saved drills: one click bookmarks a row; the category is offered, not required.
  const { saved, saveDrill, removeSavedDrill, setCategory } = useSavedDrills();
  const [busyDrillId, setBusyDrillId] = useState<string | null>(null);
  const savedByDrillId = useMemo(() => {
    const map = new Map<string, SavedDrill>();
    for (const s of saved) if (s.drill_id) map.set(s.drill_id, s);
    return map;
  }, [saved]);
  const options = useMemo(() => categoryOptions(saved), [saved]);
  const suggested = useMemo(() => suggestedCategories(playbook.tags), [playbook.tags]);

  const toggleSave = async (drill: PlaybookDrill) => {
    if (busyDrillId) return;
    setBusyDrillId(drill.id);
    try {
      const existing = savedByDrillId.get(drill.id);
      if (existing) {
        const count = await removeSavedDrill(existing.id);
        if (count > 0) toast(`Removed. Unlinked from ${count} goal${count === 1 ? '' : 's'}.`);
      } else {
        await saveDrill(drill, playbook);
      }
    } finally {
      setBusyDrillId(null);
    }
  };

  // The one-off jump a Goals card or the shelf asked for, once the chapters are here.
  const jumpedRef = useRef(false);
  useEffect(() => {
    if (jumpedRef.current || loading || chapters.length === 0 || initialSeconds === null) return;
    jumpedRef.current = true;
    const contains = (c: PlaybookChapter) => initialSeconds >= c.start_seconds && initialSeconds < c.end_seconds;
    const target = chapters.filter(contains).pop() ?? chapters[0];
    setActiveNumber(target.chapter_number);
    setJump((j) => ({ seconds: initialSeconds, nonce: j.nonce + 1 }));
  }, [loading, chapters, initialSeconds]);

  const isParent = (c: PlaybookChapter) => chapters.some((k) => k.parent_chapter_number === c.chapter_number);
  const active = chapters.find((c) => c.chapter_number === activeNumber) ?? chapters.find((c) => !isParent(c)) ?? chapters[0] ?? null;
  // Nothing autoplays until the player picks something.
  const userPicked = activeNumber !== null;

  const momentsByChapter = useMemo(() => {
    const map = new Map<number, typeof moments>();
    for (const m of moments) map.set(m.chapter_number, [...(map.get(m.chapter_number) ?? []), m]);
    return map;
  }, [moments]);

  const selectChapter = (chapter: PlaybookChapter) => {
    setActiveNumber(chapter.chapter_number);
    setJump((j) => ({ seconds: null, nonce: j.nonce + 1 }));
  };

  /**
   * Jumps the video to a time — in the active chapter when it contains the
   * time, else the innermost chapter that does (a sub-chapter is listed after
   * its parent and is the more specific answer).
   */
  const jumpTo = (seconds: number, chapterNumber?: number) => {
    const contains = (c: PlaybookChapter) => seconds >= c.start_seconds && seconds < c.end_seconds;
    const target =
      chapters.find((c) => c.chapter_number === chapterNumber) ??
      (active && contains(active) ? active : null) ??
      chapters.filter(contains).pop() ??
      active;
    if (!target) return;
    setActiveNumber(target.chapter_number);
    setJump((j) => ({ seconds, nonce: j.nonce + 1 }));
  };

  if (loading) {
    return <div className="animate-pulse" style={{ margin: '20px', height: '320px', background: SURFACE.card, borderRadius: RADIUS.card }} />;
  }
  if (!active) {
    return <p style={{ fontFamily: FONT.body, fontSize: '13px', color: TEXT.body, padding: '24px 20px' }}>This playbook has no chapters.</p>;
  }

  const videoId = playbook.video_url ? extractYouTubeId(playbook.video_url) : null;
  const startAt = jump.seconds !== null && jump.seconds >= active.start_seconds && jump.seconds < active.end_seconds ? jump.seconds : active.start_seconds;
  const embedSrc = videoId
    ? `https://www.youtube.com/embed/${videoId}?start=${startAt}&end=${active.end_seconds}&rel=0${userPicked ? '&autoplay=1' : ''}`
    : null;

  const overlaps = (d: PlaybookDrill) =>
    d.source_start_seconds !== null && d.source_start_seconds < active.end_seconds && (d.source_end_seconds ?? d.source_start_seconds) >= active.start_seconds;
  const chapterDrills = drills.filter(overlaps);
  const otherDrills = drills.filter((d) => !overlaps(d));

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'notes', label: 'Notes' },
    { id: 'takeaways', label: 'Takeaways', count: active.key_takeaways.length },
    { id: 'drills', label: 'Drills', count: drills.length },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:h-full lg:min-h-0">
      {/* Chapters and their moments. On a phone they sit between the pinned video and the notes. */}
      <nav
        aria-label="Chapters"
        className="order-2 lg:order-1 lg:overflow-y-auto lg:min-h-0 lg:border-r"
        style={{ borderColor: SURFACE.cardBorder, padding: '14px 12px 18px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 8px', color: TEXT.label, ...monoCaps }}>
          <span>Chapters</span>
          <span>
            {chapters.length} · {moments.length} moments
          </span>
        </div>

        {chapters.map((chapter) => {
          const isActive = chapter.chapter_number === active.chapter_number;
          const chapterMoments = momentsByChapter.get(chapter.chapter_number) ?? [];
          return (
            <div
              key={chapter.id}
              style={{
                borderLeft: `2px solid ${isActive ? accent : 'transparent'}`,
                background: isActive ? SURFACE.card : 'transparent',
                borderRadius: `0 ${RADIUS.card} ${RADIUS.card} 0`,
                marginLeft: chapter.depth === 2 ? '18px' : 0,
              }}
            >
              <button
                type="button"
                onClick={() => selectChapter(chapter)}
                aria-current={isActive ? 'true' : undefined}
                style={{ ...plainButton, display: 'flex', alignItems: 'baseline', gap: '10px', width: '100%', padding: '10px 10px' }}
              >
                <span style={{ fontFamily: FONT.mono, fontSize: '11px', fontWeight: 700, color: isActive ? accent : TEXT.dim, minWidth: '16px' }}>
                  {chapter.chapter_number}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.body, fontSize: '13.5px', fontWeight: 500, lineHeight: 1.35, color: isActive ? TEXT.primary : TEXT.body }}>
                  {chapter.title}
                  {!isActive && chapterMoments.length > 0 && (
                    <span style={{ display: 'block', fontFamily: FONT.mono, fontSize: '10px', color: TEXT.dim, marginTop: '2px' }}>
                      {chapterMoments.length} {chapterMoments.length === 1 ? 'moment' : 'moments'}
                    </span>
                  )}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: '11px', color: TEXT.label, whiteSpace: 'nowrap' }}>
                  {range(chapter.start_seconds, chapter.end_seconds)}
                </span>
              </button>

              {isActive && chapterMoments.length > 0 && (
                <ul aria-label={`Moments in ${chapter.title}`} style={{ listStyle: 'none', margin: 0, padding: '0 8px 10px 30px' }}>
                  {chapterMoments.map((moment) => {
                    const current = jump.seconds === moment.start_seconds;
                    return (
                      <li key={moment.id}>
                        <button
                          type="button"
                          onClick={() => jumpTo(moment.start_seconds, chapter.chapter_number)}
                          style={{
                            ...plainButton,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            width: '100%',
                            padding: '6px 6px',
                            borderRadius: '4px',
                            background: current ? SURFACE.chip : 'transparent',
                          }}
                        >
                          <CornerDownRight size={13} style={{ flexShrink: 0, marginTop: '2px', color: current ? accent : TEXT.dim }} />
                          <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.body, fontSize: '12.5px', lineHeight: 1.4, color: current ? TEXT.primary : TEXT.body }}>
                            {moment.label}
                          </span>
                          <span style={{ fontFamily: FONT.mono, fontSize: '10.5px', color: TEXT.label, whiteSpace: 'nowrap' }}>
                            {formatTimestamp(moment.start_seconds)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/*
        Video + the active chapter's notes. One scrolling column on desktop; on a
        phone the wrapper dissolves (`contents`) so the video can be ordered above
        the chapter list and the notes below it.
      */}
      <section className="contents lg:block lg:order-2 lg:overflow-y-auto lg:min-h-0">
        <div className="order-1 sticky top-0 z-10 lg:static" style={{ background: SURFACE.page, padding: '14px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
            <h3 style={{ fontFamily: FONT.heading, fontSize: '19px', fontWeight: 600, textTransform: 'uppercase', lineHeight: 1.2, color: TEXT.primary }}>
              {active.title}
            </h3>
            <span style={{ fontFamily: FONT.mono, fontSize: '11px', color: TEXT.label, whiteSpace: 'nowrap' }}>
              {range(active.start_seconds, active.end_seconds)}
            </span>
          </div>

          <div style={{ aspectRatio: '16 / 9', background: SURFACE.inset, border: `1px solid ${SURFACE.insetBorder}`, borderRadius: RADIUS.card, overflow: 'hidden' }}>
            {embedSrc ? (
              <iframe
                key={`${active.id}-${jump.nonce}`}
                src={embedSrc}
                title={`${playbook.title} — ${active.title}`}
                style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0 24px', textAlign: 'center' }}>
                <VideoOff size={26} color={TEXT.dim} />
                <p style={{ fontFamily: FONT.body, fontSize: '13px', color: TEXT.body }}>No video linked</p>
                <p style={{ fontFamily: FONT.body, fontSize: '12px', color: TEXT.dim }}>
                  Add <code style={{ fontFamily: FONT.mono }}>video_url:</code> to the note&rsquo;s frontmatter and sync again.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="order-3" style={{ padding: '0 20px 28px' }}>
          <div role="tablist" style={{ display: 'flex', gap: '20px', borderBottom: `1px solid ${SURFACE.cardBorder}`, margin: '4px 0 14px' }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                style={{
                  ...plainButton,
                  ...monoCaps,
                  padding: '0 0 9px',
                  marginBottom: '-1px',
                  color: tab === t.id ? TEXT.primary : TEXT.label,
                  borderBottom: `2px solid ${tab === t.id ? accent : 'transparent'}`,
                }}
              >
                {t.label}
                {!!t.count && <span style={{ color: TEXT.dim }}> {t.count}</span>}
              </button>
            ))}
          </div>

          <div style={{ fontFamily: FONT.body, fontSize: '13.5px', color: TEXT.body, lineHeight: 1.65 }}>
            {tab === 'notes' &&
              (active.notes_markdown ? (
                <NotesMarkdown markdown={active.notes_markdown} onJump={jumpTo} />
              ) : (
                <p style={{ color: TEXT.dim }}>No notes for this chapter.</p>
              ))}

            {tab === 'takeaways' &&
              (active.key_takeaways.length > 0 ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
                  {active.key_takeaways.map((takeaway, i) => (
                    <li key={i} style={{ background: SURFACE.inset, border: `1px solid ${SURFACE.insetBorder}`, borderRadius: RADIUS.card, padding: '10px 12px 0' }}>
                      <NotesMarkdown markdown={takeaway} onJump={jumpTo} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: TEXT.dim }}>No takeaways in this chapter. Callouts such as &gt; [!tip] in the note become takeaways.</p>
              ))}

            {tab === 'drills' &&
              (drills.length > 0 ? (
                <>
                  {chapterDrills.length > 0 && (
                    <DrillList
                      heading="From this chapter"
                      drills={chapterDrills}
                      onJump={jumpTo}
                      accent={accent}
                      savedByDrillId={savedByDrillId}
                      categoryOptions={options}
                      suggested={suggested}
                      busyDrillId={busyDrillId}
                      onToggleSave={toggleSave}
                      onSetCategory={(s, category) => setCategory(s.id, category)}
                      markedDrillId={initialDrillId}
                    />
                  )}
                  {otherDrills.length > 0 && (
                    <DrillList
                      heading={chapterDrills.length > 0 ? 'Rest of the playbook' : 'All drills'}
                      drills={otherDrills}
                      onJump={jumpTo}
                      accent={accent}
                      savedByDrillId={savedByDrillId}
                      categoryOptions={options}
                      suggested={suggested}
                      busyDrillId={busyDrillId}
                      onToggleSave={toggleSave}
                      onSetCategory={(s, category) => setCategory(s.id, category)}
                      markedDrillId={initialDrillId}
                    />
                  )}
                </>
              ) : (
                <p style={{ color: TEXT.dim }}>No drills. Rows of the note&rsquo;s Practice Extraction table become drills.</p>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

interface DrillListProps {
  heading: string;
  drills: PlaybookDrill[];
  onJump(seconds: number): void;
  /** Everything below is optional: without it the list renders read-only, as before saved drills existed. */
  accent?: string;
  savedByDrillId?: Map<string, SavedDrill>;
  categoryOptions?: CategoryOption[];
  suggested?: string[];
  busyDrillId?: string | null;
  onToggleSave?(drill: PlaybookDrill): void;
  onSetCategory?(saved: SavedDrill, category: string | null): void;
  /** This row gets the accent border and is scrolled into view once. */
  markedDrillId?: string | null;
}

function DrillList({
  heading,
  drills,
  onJump,
  accent = SEMANTIC.mechanics,
  savedByDrillId,
  categoryOptions: options = [],
  suggested = [],
  busyDrillId = null,
  onToggleSave,
  onSetCategory,
  markedDrillId = null,
}: DrillListProps) {
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const markedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    markedRef.current?.scrollIntoView({ block: 'center' });
  }, [markedDrillId]);

  return (
    <div style={{ marginBottom: '18px' }}>
      <p style={{ ...monoCaps, color: TEXT.label, marginBottom: '8px' }}>{heading}</p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '8px' }}>
        {drills.map((drill) => {
          const saved = savedByDrillId?.get(drill.id) ?? null;
          const marked = markedDrillId !== null && drill.id === markedDrillId;
          return (
            <li
              key={drill.id}
              ref={marked ? markedRef : undefined}
              style={{ background: SURFACE.inset, border: `1px solid ${marked ? accent : SURFACE.insetBorder}`, borderRadius: RADIUS.card, padding: '11px 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <Crosshair size={12} style={{ flexShrink: 0, color: SEMANTIC.mindset, transform: 'translateY(1px)' }} />
                <p style={{ flex: 1, minWidth: 0, fontWeight: 600, color: TEXT.primary, lineHeight: 1.4 }}>{drill.title}</p>
                {onToggleSave && (
                  <SaveDrillButton saved={saved !== null} busy={busyDrillId === drill.id} onToggle={() => onToggleSave(drill)} />
                )}
                {drill.source_start_seconds !== null && (
                  <button
                    type="button"
                    onClick={() => onJump(drill.source_start_seconds as number)}
                    title="Watch where this drill comes from"
                    style={{ ...plainButton, display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: FONT.mono, fontSize: '10.5px', color: TEXT.label, whiteSpace: 'nowrap' }}
                  >
                    <Play size={10} /> {formatTimestamp(drill.source_start_seconds)}
                  </button>
                )}
              </div>
              <dl style={{ margin: '6px 0 0 22px', display: 'grid', gap: '3px', fontSize: '12.5px', lineHeight: 1.5 }}>
                {drill.scenario && <DrillRow term="Scenario" value={drill.scenario} mono />}
                {drill.venue && <DrillRow term="Where" value={drill.venue} />}
                {drill.cue && <DrillRow term="Watch for" value={drill.cue} />}
                {drill.success_signal && <DrillRow term="Success" value={drill.success_signal} />}
              </dl>
              {saved && onSetCategory && (
                <div style={{ margin: '7px 0 0 22px' }}>
                  <p style={{ fontFamily: FONT.mono, fontSize: '10.5px', color: TEXT.label, display: 'flex', flexWrap: 'wrap', gap: '0 6px' }}>
                    <span style={{ color: accent }}>Saved</span>
                    {saved.category && (
                      <>
                        <span style={{ color: TEXT.dim }}>·</span>
                        <span style={{ color: TEXT.body }}>{saved.category}</span>
                      </>
                    )}
                    <span style={{ color: TEXT.dim }}>·</span>
                    <button
                      type="button"
                      data-category-trigger
                      onClick={() => setPickerFor(pickerFor === drill.id ? null : drill.id)}
                      style={{ ...plainButton, textDecoration: 'underline', textUnderlineOffset: '3px', color: TEXT.label }}
                    >
                      {saved.category ? 'Change' : 'Add category'}
                    </button>
                  </p>
                  {pickerFor === drill.id && (
                    <CategoryPicker
                      options={options}
                      suggested={suggested}
                      current={saved.category}
                      onPick={(category) => {
                        onSetCategory(saved, category);
                        setPickerFor(null);
                      }}
                      onClose={() => setPickerFor(null)}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DrillRow({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <dt style={{ ...monoCaps, fontSize: '9px', color: TEXT.dim, minWidth: '66px', paddingTop: '3px' }}>{term}</dt>
      <dd style={{ margin: 0, color: mono ? TEXT.primary : TEXT.body, fontFamily: mono ? FONT.mono : FONT.body, fontSize: mono ? '12px' : undefined }}>{value}</dd>
    </div>
  );
}

// ─── Dialog shell ─────────────────────────────────────────────────────────

interface PlaybookReaderProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  playbooks: PlaybookSummary[];
  /** Opens straight onto this playbook; null opens the library. */
  initialPlaybookId: string | null;
  /** With either set, the playbook opens on its Drills tab at this time with this drill marked. */
  initialSeconds?: number | null;
  initialDrillId?: string | null;
}

interface Target {
  playbookId: string | null;
  seconds: number | null;
  drillId: string | null;
}

/** Full-screen reader: the playbook library, or one playbook's chapters, video and notes. */
export function PlaybookReader({ open, onOpenChange, playbooks, initialPlaybookId, initialSeconds = null, initialDrillId = null }: PlaybookReaderProps) {
  const [target, setTarget] = useState<Target>({ playbookId: initialPlaybookId, seconds: initialSeconds, drillId: initialDrillId });
  const setSelectedId = (playbookId: string | null) => setTarget({ playbookId, seconds: null, drillId: null });

  // Each opening starts where the caller pointed it, not where the last one ended.
  useEffect(() => {
    if (open) setTarget({ playbookId: initialPlaybookId, seconds: initialSeconds, drillId: initialDrillId });
  }, [open, initialPlaybookId, initialSeconds, initialDrillId]);

  const playbook = playbooks.find((p) => p.id === target.playbookId) ?? null;
  const { detail, loading } = usePlaybookDetail(open ? playbook?.id ?? null : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 p-0 max-w-none w-screen h-[100dvh] border-0 sm:rounded-none overflow-y-auto lg:overflow-hidden"
        style={{ background: SURFACE.page, color: TEXT.body }}
      >
        <header
          style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 52px 14px 20px', borderBottom: `1px solid ${SURFACE.cardBorder}`, flexShrink: 0 }}
        >
          {playbook && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              style={{ ...plainButton, ...monoCaps, display: 'inline-flex', alignItems: 'center', gap: '6px', color: TEXT.label, flexShrink: 0 }}
            >
              <ArrowLeft size={13} /> Library
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <DialogTitle
              style={{ fontFamily: FONT.mono, fontSize: '13px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: playbook ? kindColorOf(playbook) : SEMANTIC.mechanics }}
            >
              Playbook
            </DialogTitle>
            <DialogDescription
              style={{ fontFamily: FONT.body, fontSize: '12.5px', color: TEXT.body, marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {playbook
                ? [playbook.title, playbook.creator].filter(Boolean).join(' · ')
                : `${playbooks.length} ${playbooks.length === 1 ? 'playbook' : 'playbooks'} from your vault`}
            </DialogDescription>
          </div>
        </header>

        <div className="lg:flex-1 lg:min-h-0">
          {playbook ? (
            // Keyed so chapter and tab state reset when another playbook — or another drill in it — is picked.
            <PlaybookView
              key={`${playbook.id}:${target.drillId ?? ''}:${target.seconds ?? ''}`}
              playbook={playbook}
              detail={detail}
              loading={loading}
              initialSeconds={target.seconds}
              initialDrillId={target.drillId}
            />
          ) : (
            <Library
              playbooks={playbooks}
              onPick={setSelectedId}
              onOpenDrill={(playbookId, seconds, drillId) => setTarget({ playbookId, seconds, drillId })}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
