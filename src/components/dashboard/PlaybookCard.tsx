import { useState } from 'react';
import { Crosshair, RefreshCw, ArrowRight, ChevronDown, Play } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import { getThemeConfig, THEME_KIND_COLOR } from '@/constants/debrief-config';
import { SURFACE, TEXT, RADIUS, FONT, SEMANTIC } from '@/constants/theme';
import type { VaultTip } from '@/types/debrief';
import type { TipMatch } from '@/hooks/useVaultTip';
import type { PlaybookSummary } from '@/types/playbook';

interface PlaybookCardProps {
  tip: VaultTip | null;
  matchedOn: TipMatch;
  matchedTheme: string | null;
  loading: boolean;
  isEmpty: boolean;
  hasMultiple: boolean;
  onNext(): void;
  /** The playbook built from the same vault note as `tip`, when that note has timed chapters. */
  playbook?: PlaybookSummary | null;
  /** How many playbooks exist in total — drives the "All playbooks" link. */
  playbookCount?: number;
  /** Opens the reader on a playbook, or on the library when called with null. */
  onOpenPlaybook?(playbookId: string | null): void;
}

const VAULT_NAME = import.meta.env.VITE_OBSIDIAN_VAULT_NAME as string | undefined;

/** obsidian://open?vault=<vault>&file=<path without .md> */
function obsidianUrl(sourcePath: string): string | null {
  if (!VAULT_NAME) return null;
  const file = sourcePath.replace(/\.md$/i, '');
  return `obsidian://open?vault=${encodeURIComponent(VAULT_NAME)}&file=${encodeURIComponent(file)}`;
}

export function PlaybookCard({
  tip,
  matchedOn,
  matchedTheme,
  loading,
  isEmpty,
  hasMultiple,
  onNext,
  playbook = null,
  playbookCount = 0,
  onOpenPlaybook,
}: PlaybookCardProps) {
  const [showMeta, setShowMeta] = useState(false);

  // Amber by default: a technique note is mechanics unless it says otherwise.
  const kindColor = tip?.kind === 'mindset' ? SEMANTIC.mindset : SEMANTIC.mechanics;

  const cardStyle: React.CSSProperties = {
    background: SURFACE.card,
    border: `1px solid ${SURFACE.cardBorder}`,
    borderTop: `2px solid ${isEmpty || !tip ? TEXT.label : kindColor}`,
    borderRadius: RADIUS.card,
    padding: '18px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    height: '100%',
    minHeight: 0,
  };

  if (loading) {
    return <div style={{ ...cardStyle, minHeight: '260px' }} className="animate-pulse" />;
  }

  if (isEmpty || !tip) {
    return (
      <div style={cardStyle}>
        <SectionTitle label="Playbook" />
        <p style={{ fontFamily: FONT.body, fontSize: '13px', color: TEXT.body, lineHeight: 1.6 }}>
          No tips synced yet &mdash; run{' '}
          <code
            style={{
              fontFamily: FONT.mono,
              fontSize: '12px',
              background: SURFACE.inset,
              border: `1px solid ${SURFACE.insetBorder}`,
              borderRadius: '4px',
              padding: '1px 6px',
              color: TEXT.primary,
            }}
          >
            npm run sync-vault
          </code>
        </p>
      </div>
    );
  }

  const themeConfig = getThemeConfig(matchedTheme);
  const showMatch = matchedOn === 'theme' && !!themeConfig;
  const matchColor = THEME_KIND_COLOR[themeConfig?.kind ?? 'neutral'];
  const href = obsidianUrl(tip.source_path);

  return (
    <div style={cardStyle}>
      <SectionTitle label="Playbook" color={kindColor} />

      {/* Eyebrow: what this tip is, and why it is the one showing */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap', marginTop: '-4px' }}>
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: '9.5px',
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: kindColor,
          }}
        >
          {tip.kind ?? 'technique'}
        </span>
        {showMatch ? (
          <span style={{ fontFamily: FONT.mono, fontSize: '9.5px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT.dim }}>
            · matched to <span style={{ color: matchColor }}>{themeConfig?.label}</span>
          </span>
        ) : (
          tip.tags[0] && (
            <span style={{ fontFamily: FONT.mono, fontSize: '9.5px', letterSpacing: '0.1em', textTransform: 'uppercase', color: TEXT.dim }}>
              · {tip.tags[0]}
            </span>
          )
        )}
      </div>

      <h3
        style={{
          fontFamily: FONT.heading,
          fontSize: '21px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.01em',
          lineHeight: 1.15,
          color: TEXT.primary,
          textWrap: 'balance',
        } as React.CSSProperties}
      >
        {tip.title}
      </h3>

      {/*
        Fills the space down to the drill box so this card matches the Logbook's
        height, with a fade where the text runs past the available room.
      */}
      <div
        style={{
          position: 'relative',
          flex: '1 1 auto',
          minHeight: 0,
          overflow: 'hidden',
          maxHeight: '9.6em',
          WebkitMaskImage: 'linear-gradient(180deg, #000 calc(100% - 22px), transparent 100%)',
          maskImage: 'linear-gradient(180deg, #000 calc(100% - 22px), transparent 100%)',
        }}
      >
        <p style={{ fontFamily: FONT.body, fontSize: '13px', color: TEXT.body, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {tip.body}
        </p>
      </div>

      {tip.drill && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: SURFACE.inset,
            border: `1px solid ${SURFACE.insetBorder}`,
            borderRadius: RADIUS.card,
            padding: '12px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0,
              fontFamily: FONT.mono,
              fontSize: '9.5px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: SEMANTIC.mindset,
              paddingTop: '1px',
            }}
          >
            <Crosshair size={11} /> Drill
          </span>
          <p style={{ flex: 1, fontFamily: FONT.body, fontSize: '12px', color: TEXT.primary, lineHeight: 1.55 }}>
            {tip.drill}
          </p>
        </div>
      )}

      {/* The same note as a video playbook: chapters and moments to jump to */}
      {playbook && onOpenPlaybook && (
        <button
          onClick={() => onOpenPlaybook(playbook.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            background: 'transparent',
            border: `1px solid ${SURFACE.insetBorder}`,
            borderRadius: RADIUS.card,
            padding: '10px 12px',
            cursor: 'pointer',
            fontFamily: FONT.mono,
            fontSize: '10.5px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: TEXT.primary,
          }}
        >
          <Play size={12} color={kindColor} />
          Watch the breakdown
          <span style={{ marginLeft: 'auto', fontWeight: 400, letterSpacing: '0.06em', color: TEXT.label }}>
            {playbook.chapter_count} chapters · {playbook.moment_count} moments
          </span>
        </button>
      )}

      {/* Footer — tags and vault path live behind Read full note, not at rest */}
      <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: `1px solid ${SURFACE.cardBorder}` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {href ? (
              <a
                href={href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: FONT.mono,
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: TEXT.label,
                  textDecoration: 'none',
                }}
              >
                Read full note <ArrowRight size={12} />
              </a>
            ) : (
              <span style={{ fontFamily: FONT.mono, fontSize: '10.5px', color: TEXT.dim }}>
                Set VITE_OBSIDIAN_VAULT_NAME to open notes
              </span>
            )}
            <button
              onClick={() => setShowMeta((v) => !v)}
              aria-expanded={showMeta}
              aria-label="Show tags and vault path"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: TEXT.dim,
                transform: showMeta ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms ease',
              }}
            >
              <ChevronDown size={13} />
            </button>
          </div>

          {playbookCount > 0 && onOpenPlaybook && (
            <button
              onClick={() => onOpenPlaybook(null)}
              style={{
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
              All playbooks · {playbookCount}
            </button>
          )}

          {hasMultiple && (
            <button
              onClick={onNext}
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
              <RefreshCw size={11} /> Next tip
            </button>
          )}
        </div>

        {showMeta && (
          <div style={{ marginTop: '10px' }}>
            {tip.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5" style={{ marginBottom: '7px' }}>
                {tip.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: FONT.body,
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: RADIUS.chip,
                      background: SURFACE.chip,
                      border: `1px solid ${SURFACE.insetBorder}`,
                      color: TEXT.body,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p
              style={{
                fontFamily: FONT.mono,
                fontSize: '10px',
                color: TEXT.dim,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={tip.source_path}
            >
              {tip.source_path}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
