import {
  Sparkles,
  AlertCircle,
  Crosshair,
  Brain,
  Target,
  ArrowRight,
  Flame,
} from 'lucide-react';
import type { GoalStrategy } from '@/hooks/useGoalStrategy';

type CoachState = 'improving' | 'declining' | 'inactive' | 'steady' | 'insufficient';

interface MissionBriefingV2Props {
  coachState: CoachState;
  coachData: {
    weakest?: { category: string };
    strongest?: { category: string };
    daysSinceLast?: number;
    suggestedScenario?: string;
  } | null;
  momentumData: {
    delta?: number;
    state?: string;
  } | null;
  onNavigate: (tab: string) => void;
  goalStrategy: GoalStrategy;
}

const STATE_CONFIG: Record<
  CoachState,
  { color: string; glow: string; icon: any; label: string }
> = {
  improving: {
    color: '#3DD598',
    glow: '#3DD59850',
    icon: Sparkles,
    label: "You're in the zone",
  },
  declining: {
    color: '#FFCA3A',
    glow: '#FFCA3A50',
    icon: AlertCircle,
    label: 'Time to recalibrate',
  },
  inactive: {
    color: '#FF4655',
    glow: '#FF465550',
    icon: Crosshair,
    label: 'Your aim is waiting',
  },
  steady: {
    color: '#53CADC',
    glow: '#53CADC50',
    icon: Brain,
    label: 'Holding steady',
  },
  insufficient: {
    color: '#53CADC',
    glow: '#53CADC50',
    icon: Brain,
    label: 'Building your profile',
  },
};

export function MissionBriefingV2({
  coachState,
  coachData,
  momentumData,
  onNavigate,
  goalStrategy,
}: MissionBriefingV2Props) {
  const config = STATE_CONFIG[coachState];
  const Icon = config.icon;

  // Determine if we're in goal-aware mode
  const isGoalAware =
    goalStrategy.hasGoal && goalStrategy.primaryGate !== null;
  const isGoalComplete =
    goalStrategy.hasGoal && goalStrategy.gates.length === 0 && goalStrategy.targetRank !== null;

  // Header label
  const headerLabel = isGoalAware
    ? `Path to ${goalStrategy.primaryGate!.name}`
    : isGoalComplete
    ? 'On Track'
    : config.label;

  const headerColor = isGoalAware ? '#FF4655' : isGoalComplete ? '#3DD598' : config.color;
  const HeaderIcon = isGoalAware ? Target : isGoalComplete ? Sparkles : Icon;

  return (
    <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
          Mission Briefing
        </h3>
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: headerColor,
            boxShadow: `0 0 8px ${headerColor}50`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>

      <div className="flex-1 space-y-4">
        {/* State banner */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: `${headerColor}08`,
            border: `1px solid ${headerColor}33`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <HeaderIcon className="w-4 h-4" style={{ color: headerColor }} />
            <span
              className="font-['Rajdhani'] font-semibold text-sm"
              style={{ color: headerColor }}
            >
              {headerLabel}
            </span>
          </div>
          <p className="text-[#9CA8B3] text-[13px] font-['Inter'] leading-relaxed">
            {isGoalAware
              ? goalStrategy.strategicInsight
              : isGoalComplete
              ? 'All subcategories meet your target. Maintain with balanced training.'
              : getFallbackBody(coachState, coachData, momentumData)}
          </p>
        </div>

        {/* Session prescription (goal-aware) OR fallback mission */}
        {isGoalAware && goalStrategy.sessionPrescription ? (
          <div className="bg-[#0F1923] rounded-xl p-4">
            <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider">
              Today's Mission
            </span>
            <p className="text-[#ECE8E1] text-sm font-['Inter'] leading-relaxed mt-2">
              {goalStrategy.sessionPrescription.sessionStructure}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Flame className="w-3.5 h-3.5 text-[#FF4655]" />
              <span className="text-[#FF4655] text-[13px] font-['Inter'] font-medium">
                {goalStrategy.sessionPrescription.scenario}
              </span>
            </div>
            <p className="text-[#5A6872] text-[11px] font-['Inter'] mt-2 italic">
              {goalStrategy.sessionPrescription.focusTip}
            </p>
            <p className="text-[#5A6872] text-[10px] font-['Inter'] mt-1">
              ~{goalStrategy.sessionPrescription.estimatedMinutes} min focused session
            </p>
          </div>
        ) : (
          <FallbackMission
            coachState={coachState}
            coachData={coachData}
          />
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => onNavigate('training')}
        className="mt-4 w-full rounded-xl px-4 py-3 font-['Rajdhani'] text-[15px] font-bold tracking-wide text-white hover:brightness-110 transition-all inline-flex items-center justify-center gap-2"
        style={{
          background: 'linear-gradient(135deg, #FF4655, #FF6B75)',
          boxShadow: '0 4px 24px rgba(255,70,85,0.3)',
        }}
      >
        Start Training <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// --- Fallback logic (same as current MissionBriefing.tsx) ---

function getFallbackBody(
  coachState: CoachState,
  coachData: MissionBriefingV2Props['coachData'],
  momentumData: MissionBriefingV2Props['momentumData']
): string {
  const delta = momentumData?.delta;
  const deltaStr = delta ? ` ${delta > 0 ? '+' : ''}${delta}%` : '';

  const messages: Record<CoachState, string> = {
    improving: `Momentum is up${deltaStr} — push boundaries, not coast.`,
    declining: `Scores dipped${deltaStr} — this is normal. Plateaus and dips are part of the process.`,
    inactive: `${coachData?.daysSinceLast || '?'} days since your last session. Muscle memory peaks at 48-72 hours between sessions.`,
    steady:
      'Consistent performance is the foundation. Try pushing into scenarios that challenge you.',
    insufficient:
      'Keep training — the coach needs more data to provide personalized missions.',
  };

  return messages[coachState];
}

function FallbackMission({
  coachState,
  coachData,
}: {
  coachState: CoachState;
  coachData: MissionBriefingV2Props['coachData'];
}) {
  const weakCat = coachData?.weakest?.category;
  const strongCat = coachData?.strongest?.category;
  const scenario = coachData?.suggestedScenario;

  const missions: Record<CoachState, string | null> = {
    improving: weakCat
      ? `Push into ${weakCat} scenarios — your ${strongCat || 'strengths'} can carry.`
      : 'Keep the streak alive. Focus on scenarios that challenge you.',
    declining: weakCat
      ? `Short focused session on ${weakCat}. Quality over quantity.`
      : 'Take a focused 15-minute session. Deliberate reps, full attention.',
    inactive:
      'A quick 10-minute warmup routine will protect your gains. Just showing up matters more than intensity today.',
    steady: weakCat ? `${weakCat} — your biggest growth opportunity` : null,
    insufficient: null,
  };

  const mission = missions[coachState];
  if (!mission) return null;

  return (
    <div className="bg-[#0F1923] rounded-xl p-4">
      <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider">
        {coachState === 'steady' ? 'Growth Area' : "Today's Mission"}
      </span>
      <p className="text-[#ECE8E1] text-sm font-['Inter'] leading-relaxed mt-2">
        {mission}
      </p>
      {scenario && (
        <div className="flex items-center gap-2 mt-2">
          <Flame className="w-3.5 h-3.5 text-[#FF4655]" />
          <span className="text-[#FF4655] text-[13px] font-['Inter'] font-medium">
            {scenario}
          </span>
        </div>
      )}
    </div>
  );
}
