import { useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { StatTile, TileValue, TileTrend } from './StatTile';
import { SURFACE, TEXT, RADIUS, FONT, SEMANTIC } from '@/constants/theme';
import { relativeTime } from '@/lib/time';
import type { PRStreakData } from '@/types/debrief';

interface MomentumData {
  state: 'improving' | 'declining' | 'steady' | 'insufficient';
  delta: number;
  sparkline: { value: number }[];
}

interface SignalsRowProps {
  momentum: MomentumData | null;
  prData: PRStreakData;
  streakDays: number;
  lastSyncedAt: string | null | undefined;
  syncing: boolean;
  onSync(): void;
}

/** Colour and wording per momentum state. Declining is amber (a weakness), never red. */
function momentumPresentation(state: MomentumData['state'] | undefined) {
  switch (state) {
    case 'improving':
      return { color: SEMANTIC.positive, trend: '↗ improving' };
    case 'declining':
      return { color: SEMANTIC.mechanics, trend: '↘ declining' };
    case 'steady':
      return { color: TEXT.label, trend: '→ flat' };
    default:
      return { color: SEMANTIC.mindset, trend: 'gathering data' };
  }
}

/** Seven day-dots, oldest first. Green = PR that day, hollow ring = today. */
function PRDayDots({ prDaysInWindow }: { prDaysInWindow: Set<string> }) {
  const days = useMemo(() => {
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      out.push({
        dateStr,
        dayName: date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
        hasPR: prDaysInWindow.has(dateStr),
        isToday: i === 0,
      });
    }
    return out;
  }, [prDaysInWindow]);

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {days.map((day) => (
        <div key={day.dateStr} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: day.hasPR ? SEMANTIC.positive : day.isToday ? 'transparent' : SURFACE.inset,
              border: day.isToday && !day.hasPR ? `1px solid ${SEMANTIC.mindset}` : 'none',
            }}
          />
          <span style={{ fontFamily: FONT.mono, fontSize: '8px', color: TEXT.dim, lineHeight: 1 }}>
            {day.dayName}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Momentum, PRs, check-in streak and sync rendered at one size — they are the
 * same class of information (a number and its trend) and used to be three.
 */
export function SignalsRow({
  momentum,
  prData,
  streakDays,
  lastSyncedAt,
  syncing,
  onSync,
}: SignalsRowProps) {
  const mo = momentumPresentation(momentum?.state);
  const hasSpark = (momentum?.sparkline?.length ?? 0) > 2;
  const insufficient = !momentum || momentum.state === 'insufficient';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatTile
        wide
        label="Momentum"
        value={
          <>
            <TileValue color={mo.color}>
              {insufficient ? '—' : `${momentum!.delta > 0 ? '+' : ''}${momentum!.delta}%`}
            </TileValue>
            <TileTrend color={mo.color}>{mo.trend}</TileTrend>
          </>
        }
        foot={
          hasSpark ? (
            <div style={{ width: '100%', height: '26px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={momentum!.sparkline}>
                  <defs>
                    <linearGradient id="signalSpark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={mo.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={mo.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={mo.color}
                    strokeWidth={1.5}
                    fill="url(#signalSpark)"
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : null
        }
      />

      <StatTile
        wide
        label="PRs this week"
        value={
          <>
            <TileValue color={prData.totalPRs > 0 ? SEMANTIC.positive : undefined}>
              {prData.totalPRs}
            </TileValue>
            {prData.totalPRs === 0 && <TileTrend>not yet</TileTrend>}
          </>
        }
        foot={<PRDayDots prDaysInWindow={prData.prDaysInWindow} />}
      />

      <StatTile
        label="Check-in streak"
        value={
          <>
            <TileValue color={streakDays > 0 ? SEMANTIC.mindset : undefined}>{streakDays}</TileValue>
            <TileTrend>days</TileTrend>
          </>
        }
        foot={
          <p style={{ fontFamily: FONT.body, fontSize: '10.5px', color: TEXT.label, lineHeight: 1.45 }}>
            Pre-training check-ins are the #1 predictor of improvement.
          </p>
        }
      />

      <StatTile
        label="Kovaaks sync"
        value={<TileValue small>{relativeTime(lastSyncedAt)}</TileValue>}
        foot={
          <button
            onClick={onSync}
            disabled={syncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              background: 'transparent',
              border: `1px solid ${SURFACE.insetBorder}`,
              borderRadius: RADIUS.card,
              color: TEXT.body,
              fontFamily: FONT.mono,
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: syncing ? 'not-allowed' : 'pointer',
              opacity: syncing ? 0.5 : 1,
            }}
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : undefined} />
            Sync now
          </button>
        }
      />
    </div>
  );
}
