import { Crosshair, ChevronRight, RefreshCw, ExternalLink } from 'lucide-react';
import { getThemeConfig, THEME_KIND_COLOR } from '@/constants/debrief-config';
import { SURFACE, TEXT, RADIUS, FONT } from '@/constants/theme';
import type { VaultTip } from '@/types/debrief';
import type { TipMatch } from '@/hooks/useVaultTip';

interface VaultTipCardProps {
  tip: VaultTip | null;
  matchedOn: TipMatch;
  matchedTheme: string | null;
  loading: boolean;
  isEmpty: boolean;
  hasMultiple: boolean;
  onNext: () => void;
}

const VAULT_NAME = import.meta.env.VITE_OBSIDIAN_VAULT_NAME as string | undefined;

/** obsidian://open?vault=<vault>&file=<path without .md> */
function obsidianUrl(sourcePath: string): string | null {
  if (!VAULT_NAME) return null;
  const file = sourcePath.replace(/\.md$/i, '');
  return `obsidian://open?vault=${encodeURIComponent(VAULT_NAME)}&file=${encodeURIComponent(file)}`;
}

export function VaultTipCard({
  tip,
  matchedOn,
  matchedTheme,
  loading,
  isEmpty,
  hasMultiple,
  onNext,
}: VaultTipCardProps) {
  const cardStyle: React.CSSProperties = {
    background: SURFACE.card,
    border: `1px solid ${SURFACE.cardBorder}`,
    borderRadius: RADIUS.card,
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  };

  const label = (text: string) => (
    <p
      style={{
        fontFamily: FONT.body,
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: TEXT.label,
      }}
    >
      {text}
    </p>
  );

  if (loading) {
    return <div style={{ ...cardStyle, minHeight: '260px' }} className="animate-pulse" />;
  }

  // Nothing synced yet - tell the user the exact command, don't invent a tip.
  if (isEmpty || !tip) {
    return (
      <div style={cardStyle}>
        {label('From your vault')}
        <p
          style={{
            fontFamily: FONT.body,
            fontSize: '13px',
            color: TEXT.body,
            marginTop: '10px',
            lineHeight: 1.6,
          }}
        >
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

  // "Matched to" only earns its place when the match was actually meaningful.
  const themeConfig = getThemeConfig(matchedTheme);
  const showMatch = matchedOn !== 'any' && !!themeConfig;
  const matchColor = THEME_KIND_COLOR[themeConfig?.kind ?? 'neutral'];
  const href = obsidianUrl(tip.source_path);

  return (
    <div style={cardStyle}>
      <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
        {label('From your vault')}
        {showMatch && (
          <span style={{ fontFamily: FONT.body, fontSize: '10px', color: TEXT.label }}>
            Matched to{' '}
            <span style={{ color: matchColor }}>{themeConfig?.label}</span>
          </span>
        )}
      </div>

      <h3
        style={{
          fontFamily: FONT.heading,
          fontSize: '17px',
          fontWeight: 600,
          color: TEXT.primary,
          lineHeight: 1.3,
          marginBottom: '8px',
        }}
      >
        {tip.title}
      </h3>

      <p
        style={{
          fontFamily: FONT.body,
          fontSize: '13px',
          color: TEXT.body,
          lineHeight: 1.65,
          whiteSpace: 'pre-wrap',
          marginBottom: '14px',
        }}
      >
        {tip.body}
      </p>

      {tip.drill && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            background: SURFACE.inset,
            border: `1px solid ${SURFACE.insetBorder}`,
            borderRadius: RADIUS.card,
            padding: '10px 12px',
            marginBottom: '14px',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: SURFACE.iconBox,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: TEXT.label,
            }}
          >
            <Crosshair size={13} />
          </span>
          <p
            style={{
              flex: 1,
              fontFamily: FONT.body,
              fontSize: '12px',
              color: TEXT.primary,
              lineHeight: 1.55,
            }}
          >
            {tip.drill}
          </p>
          <ChevronRight size={14} style={{ flexShrink: 0, color: TEXT.dim, marginTop: '4px' }} />
        </div>
      )}

      {tip.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
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

      {/* Footer pinned to the bottom so the card lines up with its neighbour */}
      <div style={{ marginTop: 'auto' }}>
        <div className="flex items-center gap-3 mb-2">
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
                fontFamily: FONT.body,
                fontSize: '11px',
                color: TEXT.body,
              }}
            >
              <RefreshCw size={11} /> Next tip
            </button>
          )}
          {href && (
            <a
              href={href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: FONT.body,
                fontSize: '11px',
                color: TEXT.body,
                textDecoration: 'none',
              }}
            >
              <ExternalLink size={11} /> Open note
            </a>
          )}
        </div>
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
    </div>
  );
}
