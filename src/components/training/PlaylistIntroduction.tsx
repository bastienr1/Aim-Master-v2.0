// Style injection — runs once at module load
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;
if (!document.querySelector('[data-playlist-intro-styles]')) {
  styleSheet.setAttribute('data-playlist-intro-styles', '');
  document.head.appendChild(styleSheet);
}

interface PlaylistIntroductionProps {
  intent: 'warmup' | 'improve';
  playlistName: string;
  scenarioCount: number;
  scenarios: Array<{ scenarioName?: string; scenario_name?: string; aimType?: string; aim_type?: string }>;
  onDismiss: () => void;
}

export function PlaylistIntroduction({ intent, playlistName, scenarioCount, scenarios, onDismiss }: PlaylistIntroductionProps) {
  const isWarmup = intent === 'warmup';
  const accentColor = isWarmup ? '#FFCA3A' : '#53CADC';

  return (
    <div
      className="w-full rounded-xl p-6 mb-6 relative border border-white/10"
      style={{
        backgroundColor: '#1C2B36',
        animation: 'slideDown 300ms ease-out',
      }}
    >
      {/* Top row: badge + dismiss */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="px-3 py-1 rounded-full uppercase text-xs font-semibold border"
          style={{
            backgroundColor: `${accentColor}15`,
            color: accentColor,
            borderColor: `${accentColor}30`,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.05em',
          }}
        >
          {isWarmup ? 'WARM UP' : 'IMPROVE'}
        </span>
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Header */}
      <h3
        className="text-xl font-semibold mb-1"
        style={{ fontFamily: 'Rajdhani, sans-serif', color: '#ECE8E1' }}
      >
        {playlistName}
      </h3>
      <p className="text-sm mb-5" style={{ fontFamily: 'Inter, sans-serif', color: '#9CA8B3' }}>
        {scenarioCount} scenarios · ~{scenarioCount * 3} min
      </p>

      {/* Body text — different per intent */}
      {isWarmup ? (
        <div className="space-y-3 mb-5">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9CA8B3', lineHeight: '1.6' }}>
            This playlist activates your core mechanics before competition. Each scenario targets a different aspect of your aim — smooth tracking, reactive flicks, target switching — warming up the neural pathways you'll rely on in-game. Treat this as activation, not a test.
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9CA8B3', lineHeight: '1.6' }}>
            When you repeat these scenarios before sessions, your brain starts recognizing the routine and shifts into performance mode faster. The movements below directly mirror what you do in ranked.
          </p>
          <blockquote
            className="pl-4 my-4 italic"
            style={{ borderLeft: '2px solid #FFCA3A', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9CA8B3', lineHeight: '1.6' }}
          >
            Every rep wraps myelin around the neural circuit, making the signal faster and more automatic. A focused 10-minute warm-up builds more skill architecture than an unfocused hour.
            <span className="block mt-2 not-italic text-xs" style={{ color: '#5A6872' }}>
              — adapted from The Talent Code
            </span>
          </blockquote>
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9CA8B3', lineHeight: '1.6' }}>
            This playlist targets deliberate skill development. Unlike warm-ups, improvement sessions push you into uncomfortable territory — scenarios where you're forced to adapt, slow down, and build new movement patterns from scratch.
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9CA8B3', lineHeight: '1.6' }}>
            Aim training works, but the benefits compound over time. The first few sessions might feel awkward or frustrating — that's the signal growth is happening. Players who stick with structured practice for 2-3 weeks consistently report noticeable in-game improvement.
          </p>
          <blockquote
            className="pl-4 my-4 italic"
            style={{ borderLeft: '2px solid #53CADC', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#9CA8B3', lineHeight: '1.6' }}
          >
            Myelin doesn't care about talent. It only cares about practice. Every time you fire a signal down a neural pathway, the wrapping gets thicker — making that movement faster, more accurate, more automatic. Struggle isn't the enemy. It's the raw material.
            <span className="block mt-2 not-italic text-xs" style={{ color: '#5A6872' }}>
              — adapted from The Talent Code
            </span>
          </blockquote>
        </div>
      )}

      {/* Scenario preview */}
      <div className="mb-5">
        <h4
          className="uppercase text-xs font-semibold mb-3"
          style={{ fontFamily: 'Inter, sans-serif', color: '#5A6872', letterSpacing: '0.05em' }}
        >
          What you'll train
        </h4>
        <div className="space-y-2">
          {scenarios.slice(0, 5).map((s, i) => {
            const name = s.scenarioName || s.scenario_name || 'Unknown';
            const type = s.aimType || s.aim_type || 'other';
            const dotColor = type.toLowerCase().includes('click')
              ? '#FF4655'
              : type.toLowerCase().includes('track')
              ? '#53CADC'
              : type.toLowerCase().includes('switch')
              ? '#FFCA3A'
              : '#5A6872';
            const typeLabel = type.toLowerCase().includes('click')
              ? 'Clicking'
              : type.toLowerCase().includes('track')
              ? 'Tracking'
              : type.toLowerCase().includes('switch')
              ? 'Switching'
              : type;
            return (
              <div
                key={i}
                className="flex items-center justify-between py-1.5"
                style={{ animation: `fadeIn 200ms ease-out ${i * 50}ms both` }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#ECE8E1' }}>{name}</span>
                </div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: dotColor }}>{typeLabel}</span>
              </div>
            );
          })}
          {scenarios.length > 5 && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#5A6872' }}>
              +{scenarios.length - 5} more
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <button
          onClick={onDismiss}
          className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all hover:brightness-110"
          style={{
            backgroundColor: accentColor,
            color: '#0F1923',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Let's Go
        </button>
      </div>
    </div>
  );
}
