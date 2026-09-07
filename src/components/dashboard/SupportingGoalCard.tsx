import { MoreVertical } from 'lucide-react';
import { GOAL_TYPE_INFO } from '@/data/goalTemplates';
import { SURFACE, TEXT, RADIUS, FONT, SEMANTIC } from '@/constants/theme';
import type { Goal } from '@/types/goals';

interface SupportingGoalCardProps {
  goal: Goal;
  /** Opens the Goals tab — there are no menu actions on Home. */
  onNavigate: (tab: string) => void;
}

/**
 * Read-only echo of components/goals/GoalCard, on journal tokens.
 * Same numbers and the same at-risk rule, so the two screens never disagree.
 */
export function SupportingGoalCard({ goal, onNavigate }: SupportingGoalCardProps) {
  const typeInfo = GOAL_TYPE_INFO[goal.goal_type];

  const progress =
    goal.target_value > 0
      ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
      : 0;

  const daysLeft = goal.deadline
    ? Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Mirrors GoalCard's rule. Behind and at-risk both read as "mechanics" here:
  // red is reserved for identity and action, never a metric.
  const isAtRisk = daysLeft !== null && daysLeft <= 3 && progress < 80;
  const progressColor = isAtRisk ? SEMANTIC.mechanics : SEMANTIC.positive;

  return (
    <div
      style={{
        background: SURFACE.inset,
        border: `1px solid ${SURFACE.insetBorder}`,
        borderRadius: RADIUS.card,
        padding: '12px 13px',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: FONT.mono,
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: SEMANTIC.positive,
            }}
          >
            {typeInfo.label}
          </span>
          {goal.category && (
            <span style={{ fontFamily: FONT.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: TEXT.dim }}>
              {goal.category}
            </span>
          )}
        </div>
        <button
          onClick={() => onNavigate('goals')}
          title="Open in Goals"
          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: TEXT.dim, display: 'flex' }}
        >
          <MoreVertical size={13} />
        </button>
      </div>

      <p style={{ fontFamily: FONT.body, fontSize: '14.5px', fontWeight: 700, color: TEXT.primary, lineHeight: 1.25 }}>
        {goal.title}
      </p>

      {goal.description && (
        <p style={{ fontFamily: FONT.body, fontSize: '12px', color: TEXT.label, lineHeight: 1.45 }}>
          {goal.description}
        </p>
      )}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ fontFamily: FONT.mono, fontSize: '11px', color: TEXT.body }}>
            {goal.current_value} / {goal.target_value} {goal.unit}
          </span>
          <span style={{ fontFamily: FONT.mono, fontSize: '11px', fontWeight: 700, color: progressColor }}>
            {progress}%
          </span>
        </div>

        <div style={{ height: '4px', width: '100%', background: SURFACE.chip, borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: progressColor, borderRadius: '999px' }} />
        </div>

        {daysLeft !== null && (
          <span style={{ fontFamily: FONT.mono, fontSize: '10px', color: TEXT.dim }}>
            {daysLeft}d left
          </span>
        )}
      </div>
    </div>
  );
}
