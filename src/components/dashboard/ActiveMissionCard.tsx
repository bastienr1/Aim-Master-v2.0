import { Target, ArrowRight } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import { SupportingGoalCard } from './SupportingGoalCard';
import { SURFACE, TEXT, RADIUS, FONT, RED, SEMANTIC } from '@/constants/theme';
import type { GoalStrategy } from '@/hooks/useGoalStrategy';
import type { Goal } from '@/types/goals';

/** Voltaic/Viscose rank hues — data-derived, so exempt from the one-job rule. */
const RANK_COLORS: Record<string, string> = {
  Iron: '#7C7C7C',
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#4ECDC4',
  Diamond: '#53CADC',
  Jade: '#3DD598',
  Master: '#FF2A2A',
};

interface ActiveMissionCardProps {
  goal: Goal | null;
  strategy: GoalStrategy;
  /** All active goals; the primary is filtered out for the supporting row. */
  activeGoals: Goal[];
  onNavigate: (tab: string) => void;
}

function daysBetween(from: number, to: number): number {
  return Math.ceil((to - from) / (1000 * 60 * 60 * 24));
}

export function ActiveMissionCard({ goal, strategy, activeGoals, onNavigate }: ActiveMissionCardProps) {
  const cardStyle: React.CSSProperties = {
    background: SURFACE.card,
    border: `1px solid ${SURFACE.cardBorder}`,
    // The mission frame is deliberately neutral — the only hue is the target icon.
    borderTop: `2px solid ${TEXT.label}`,
    borderRadius: RADIUS.card,
    padding: '16px 18px 18px',
  };

  if (!goal) {
    return (
      <div
        style={{ ...cardStyle, cursor: 'pointer' }}
        onClick={() => onNavigate('goals')}
      >
        <SectionTitle label="Active Mission" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Target size={18} style={{ color: TEXT.label }} />
            <div>
              <p style={{ fontFamily: FONT.heading, fontSize: '16px', fontWeight: 600, color: TEXT.primary }}>
                Set a Goal
              </p>
              <p style={{ fontFamily: FONT.body, fontSize: '12px', color: TEXT.label }}>
                Unlock your personalized roadmap and daily coaching
              </p>
            </div>
          </div>
          <ArrowRight size={16} style={{ color: TEXT.label }} />
        </div>
      </div>
    );
  }

  const now = Date.now();
  const daysLeft = goal.deadline ? Math.max(0, daysBetween(now, new Date(goal.deadline).getTime())) : null;

  // "Day n of N" from the goal's own span, so it never disagrees with the deadline.
  const startMs = new Date(goal.created_at).getTime();
  const totalDays = goal.deadline
    ? Math.max(1, daysBetween(startMs, new Date(goal.deadline).getTime()))
    : null;
  const dayIndex = totalDays ? Math.min(totalDays, Math.max(1, daysBetween(startMs, now))) : null;
  const elapsedPct = totalDays && dayIndex ? Math.round((dayIndex / totalDays) * 100) : 0;

  const onTarget = strategy.hasGoal && strategy.gates.length === 0;
  const supporting = activeGoals.filter((g) => g.id !== goal.id).slice(0, 2);

  return (
    <div style={cardStyle}>
      <SectionTitle label="Active Mission" sub={daysLeft !== null ? `Goals · ${daysLeft}d left` : 'Goals'} />

      {/* Mission body */}
      <div
        style={{
          background: SURFACE.inset,
          border: `1px solid ${SURFACE.insetBorder}`,
          borderRadius: RADIUS.card,
          padding: '14px',
          marginTop: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Target size={18} style={{ color: RED, flexShrink: 0 }} />
          <h2
            className="text-[24px] lg:text-[28px]"
            style={{
              fontFamily: FONT.heading,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              lineHeight: 1.05,
              color: TEXT.primary,
            }}
          >
            {goal.title}
          </h2>
          <span
            style={{
              fontFamily: FONT.body,
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: RADIUS.chip,
              background: SURFACE.chip,
              border: `1px solid ${onTarget ? SEMANTIC.positive : SEMANTIC.mechanics}40`,
              color: onTarget ? SEMANTIC.positive : SEMANTIC.mechanics,
              whiteSpace: 'nowrap',
            }}
          >
            {/*
              The spec asks for "n of m on target". GoalStrategy exposes only the
              gates that are *behind* — there is no total to divide by — so the
              honest label counts what is left rather than inventing an m.
            */}
            {onTarget
              ? 'All subcategories on target'
              : `${strategy.gates.length} subcategor${strategy.gates.length === 1 ? 'y' : 'ies'} to work on`}
          </span>
        </div>

        {/* Gates stay, but below the pill rather than replacing it */}
        {strategy.gates.length > 0 && (
          <div className="flex flex-wrap gap-2" style={{ marginTop: '10px' }}>
            {strategy.gates.slice(0, 3).map((gate) => (
              <div
                key={gate.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: SURFACE.chip,
                  borderRadius: RADIUS.card,
                  padding: '5px 9px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: RANK_COLORS[gate.rank] || TEXT.label,
                  }}
                />
                <span style={{ fontFamily: FONT.body, fontSize: '11.5px', color: TEXT.primary }}>{gate.name}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: '10px', color: TEXT.label }}>{gate.percentile}%</span>
                <span
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '3px',
                    color: RANK_COLORS[gate.rank] || TEXT.label,
                    background: `${RANK_COLORS[gate.rank] || TEXT.label}18`,
                  }}
                >
                  {gate.rank}
                </span>
              </div>
            ))}
            {strategy.gates.length > 3 && (
              <div style={{ background: SURFACE.chip, borderRadius: RADIUS.card, padding: '5px 9px' }}>
                <span style={{ fontFamily: FONT.body, fontSize: '10.5px', color: TEXT.label }}>
                  +{strategy.gates.length - 3} more
                </span>
              </div>
            )}
          </div>
        )}

        {totalDays && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ height: '4px', width: '100%', background: SURFACE.chip, borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${elapsedPct}%`, background: SEMANTIC.positive, borderRadius: '999px' }} />
            </div>
            <p style={{ fontFamily: FONT.mono, fontSize: '10px', color: TEXT.dim, marginTop: '6px' }}>
              Day {dayIndex} of {totalDays}
            </p>
          </div>
        )}
      </div>

      {/* Supporting goals */}
      {supporting.length > 0 && (
        <div style={{ marginTop: '16px' }}>
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
            Supporting goals
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {supporting.map((g) => (
              <SupportingGoalCard key={g.id} goal={g} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
