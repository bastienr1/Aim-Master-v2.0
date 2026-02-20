import { Sparkles, AlertCircle, Crosshair, Brain, Target, ArrowRight } from 'lucide-react';

type CoachState = 'improving' | 'declining' | 'inactive' | 'steady' | 'insufficient';

interface MissionBriefingProps {
  coachState: CoachState;
  coachData: {
    weakest?: { category: string };
    strongest?: { category: string };
    daysSinceLast?: number;
    suggestedScenario?: string;
  } | null;
  momentumData: {
    delta?: number;
  } | null;
  onNavigate: (tab: string) => void;
}

const STATE_CONFIG: Record<CoachState, {
  color: string; glow: string; icon: any; label: string;
}> = {
  improving:    { color: '#3DD598', glow: '#3DD59850', icon: Sparkles,    label: "You're in the zone" },
  declining:    { color: '#FFCA3A', glow: '#FFCA3A50', icon: AlertCircle, label: 'Time to recalibrate' },
  inactive:     { color: '#FF4655', glow: '#FF465550', icon: Crosshair,   label: 'Your aim is waiting' },
  steady:       { color: '#53CADC', glow: '#53CADC50', icon: Brain,       label: 'Holding steady' },
  insufficient: { color: '#53CADC', glow: '#53CADC50', icon: Brain,       label: 'Building your profile' },
};

export function MissionBriefing({ coachState, coachData, momentumData, onNavigate }: MissionBriefingProps) {
  const config = STATE_CONFIG[coachState];
  const Icon = config.icon;

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
            backgroundColor: config.color,
            boxShadow: `0 0 8px ${config.glow}`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* State-specific content */}
      <div className="flex-1 space-y-4">
        <MissionContent
          coachState={coachState}
          config={config}
          Icon={Icon}
          coachData={coachData}
          momentumData={momentumData}
        />
      </div>

      {/* CTA */}
      <button
        onClick={() => onNavigate('training')}
        className="mt-4 w-full bg-[#FF4655]/10 border border-[#FF4655]/30 text-[#FF4655] rounded-xl px-4 py-2.5 font-['Inter'] text-[13px] font-semibold hover:bg-[#FF4655]/20 transition-all inline-flex items-center justify-center gap-2"
      >
        Start Training <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Inner component — keeps the parent clean */
function MissionContent({
  coachState, config, Icon, coachData, momentumData
}: {
  coachState: CoachState;
  config: typeof STATE_CONFIG[CoachState];
  Icon: any;
  coachData: MissionBriefingProps['coachData'];
  momentumData: MissionBriefingProps['momentumData'];
}) {
  const delta = momentumData?.delta;
  const deltaStr = delta ? ` ${delta > 0 ? '+' : ''}${delta}%` : '';
  const weakCat = coachData?.weakest?.category;
  const strongCat = coachData?.strongest?.category;
  const scenario = coachData?.suggestedScenario;

  const messages: Record<CoachState, { body: string; mission: string | null }> = {
    improving: {
      body: `Momentum is up${deltaStr} — this is the time to push boundaries, not coast.`,
      mission: weakCat
        ? `Push into ${weakCat} scenarios — your ${strongCat || 'strengths'} can carry. Growth lives in the discomfort.`
        : 'Keep the streak alive. Focus on scenarios that challenge you.',
    },
    declining: {
      body: `Scores dipped${deltaStr} — this is normal. Plateaus and dips are part of the process.`,
      mission: weakCat
        ? `Short focused session on ${weakCat}. Quality over quantity — 15 mindful minutes beats 60 on autopilot.`
        : 'Take a focused 15-minute session. Deliberate reps, full attention.',
    },
    inactive: {
      body: `${coachData?.daysSinceLast || '?'} days since your last session. Muscle memory peaks at 48-72 hours between sessions.`,
      mission: 'A quick 10-minute warmup routine will protect your gains. Just showing up matters more than intensity today.',
    },
    steady: {
      body: 'Consistent performance is the foundation. Try pushing into scenarios that challenge you to break through.',
      mission: weakCat ? `${weakCat} — your biggest growth opportunity` : null,
    },
    insufficient: {
      body: 'Keep training — the coach needs more data to provide personalized missions.',
      mission: null,
    },
  };

  const msg = messages[coachState];

  return (
    <>
      <div
        className="rounded-xl p-4"
        style={{
          backgroundColor: `${config.color}08`,
          border: `1px solid ${config.color}33`,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: config.color }} />
          <span className="font-['Rajdhani'] font-semibold text-sm" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
        <p className="text-[#9CA8B3] text-[13px] font-['Inter'] leading-relaxed">{msg.body}</p>
      </div>

      {msg.mission && (
        <div className="bg-[#0F1923] rounded-xl p-4">
          <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider">
            {coachState === 'steady' ? 'Suggested Focus' : "Today's Mission"}
          </span>
          <p className="text-[#ECE8E1] text-sm font-['Inter'] mt-1.5 leading-relaxed">{msg.mission}</p>
          {scenario && (
            <div className="mt-2 flex items-center gap-2">
              <Target className="w-3.5 h-3.5" style={{ color: config.color }} />
              <span className="text-xs font-['Inter'] font-medium" style={{ color: config.color }}>
                {scenario}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
