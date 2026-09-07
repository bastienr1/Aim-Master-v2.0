import { SURFACE, TEXT, FONT, RED } from '@/constants/theme';

interface BrandBannerProps {
  /**
   * Optional banner art, drawn on the right. The gradient over it fades
   * left-to-right so the wordmark stays readable with or without art.
   */
  backgroundImage?: string;
}

function Separator() {
  return (
    <span
      aria-hidden
      style={{ display: 'inline-block', width: '3px', height: '3px', background: RED, borderRadius: '50%' }}
    />
  );
}

export function BrandBanner({ backgroundImage }: BrandBannerProps) {
  return (
    <div
      style={{
        position: 'relative',
        height: '130px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 32px',
        borderBottom: `1px solid ${SURFACE.cardBorder}`,
        background: backgroundImage
          ? `linear-gradient(90deg, ${SURFACE.page} 30%, rgba(10,10,11,0.75) 55%, rgba(10,10,11,0.25) 100%), url(${backgroundImage}) right center / cover no-repeat`
          : SURFACE.page,
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h1
          style={{
            fontFamily: FONT.heading,
            fontSize: '54px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            lineHeight: 1,
            color: TEXT.primary,
            margin: 0,
          }}
        >
          JO3AST
        </h1>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            fontFamily: FONT.mono,
            fontSize: '10px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: TEXT.label,
          }}
        >
          <span>Train</span>
          <Separator />
          <span>Compete</span>
          <Separator />
          <span>Ascend.</span>
        </div>
      </div>

      {/* Secondary lockup - the product name, subordinate to the identity */}
      <div
        className="hidden md:block"
        style={{ position: 'relative', zIndex: 1, marginLeft: '40px', paddingLeft: '40px', borderLeft: `1px solid ${SURFACE.insetBorder}` }}
      >
        <p
          style={{
            fontFamily: FONT.heading,
            fontSize: '18px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: TEXT.body,
            margin: 0,
          }}
        >
          AIM MASTER
        </p>
        <p
          style={{
            fontFamily: FONT.body,
            fontSize: '11px',
            color: TEXT.dim,
            marginTop: '4px',
          }}
        >
          Training today, better tomorrow.
        </p>
      </div>
    </div>
  );
}
