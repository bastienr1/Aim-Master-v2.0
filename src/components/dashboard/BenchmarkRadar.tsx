// src/components/dashboard/BenchmarkRadar.tsx
// Custom SVG radar chart for Voltaic S5 benchmark visualization
// 9 axes (subcategories), 8 concentric rank rings, percentile-normalized

import {
  BenchmarkRadarPoint,
  RANK_ORDER,
  RANK_COLORS,
} from '@/hooks/useBenchmarkRadarData';

// ─── Pillar Colors ───
const PILLAR_COLORS: Record<string, string> = {
  'Clicking': '#EF4444',
  'Tracking': '#3B82F6',
  'Target Switching': '#A855F7',
};

// ─── Geometry ───
const SVG_SIZE = 400;
const CENTER = SVG_SIZE / 2;
const RADAR_RADIUS = 140;          // Max radius of the outermost ring
const LABEL_RADIUS = RADAR_RADIUS + 32;  // Where axis labels sit

function polarToCartesian(angleDeg: number, radius: number): { x: number; y: number } {
  // Start from top (270°) and go clockwise
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(angleRad),
    y: CENTER + radius * Math.sin(angleRad),
  };
}

function buildPolygonPoints(values: number[], maxValue: number): string {
  const angleStep = 360 / values.length;
  return values
    .map((val, i) => {
      const radius = (val / maxValue) * RADAR_RADIUS;
      const { x, y } = polarToCartesian(i * angleStep, radius);
      return `${x},${y}`;
    })
    .join(' ');
}

// ─── Sub-components ───

/** Concentric rank ring polygons */
function RankRings({ axisCount }: { axisCount: number }) {
  const angleStep = 360 / axisCount;

  // Ring colors — subtle fills for inner 4, just lines for outer 4
  const ringStyles: { opacity: number; stroke: string; fill: string }[] = [
    { opacity: 0.06, stroke: 'rgba(135,135,135,0.15)', fill: 'rgba(135,135,135,0.04)' }, // Iron
    { opacity: 0.05, stroke: 'rgba(205,127,50,0.12)',  fill: 'rgba(205,127,50,0.03)' },  // Bronze
    { opacity: 0.04, stroke: 'rgba(192,192,192,0.10)', fill: 'rgba(192,192,192,0.02)' }, // Silver
    { opacity: 0.03, stroke: 'rgba(255,215,0,0.08)',   fill: 'rgba(255,215,0,0.02)' },   // Gold
    { opacity: 0,    stroke: 'rgba(61,213,200,0.08)',   fill: 'none' },                    // Platinum
    { opacity: 0,    stroke: 'rgba(185,242,255,0.06)',  fill: 'none' },                    // Diamond
    { opacity: 0,    stroke: 'rgba(0,168,107,0.06)',    fill: 'none' },                    // Jade
    { opacity: 0,    stroke: 'rgba(255,70,85,0.06)',    fill: 'none' },                    // Master
  ];

  return (
    <g className="rank-rings">
      {RANK_ORDER.map((rankName, tierIndex) => {
        const ringRadius = ((tierIndex + 1) / 8) * RADAR_RADIUS;
        const style = ringStyles[tierIndex];

        const points = Array.from({ length: axisCount }, (_, i) => {
          const { x, y } = polarToCartesian(i * angleStep, ringRadius);
          return `${x},${y}`;
        }).join(' ');

        return (
          <polygon
            key={rankName}
            points={points}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={0.75}
          />
        );
      }).reverse() /* Render outer first so inner fills sit on top */}
    </g>
  );
}

/** Spoke lines from center to each axis */
function GridSpokes({ axisCount }: { axisCount: number }) {
  const angleStep = 360 / axisCount;
  return (
    <g className="spokes">
      {Array.from({ length: axisCount }, (_, i) => {
        const { x, y } = polarToCartesian(i * angleStep, RADAR_RADIUS);
        return (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.75}
          />
        );
      })}
    </g>
  );
}

/** Rank tier labels positioned along the vertical axis */
function RankLabels() {
  // Show labels for Iron, Silver, Gold, Platinum, Diamond, Master (skip Bronze, Jade for clarity)
  const labelsToShow = [
    { name: 'Iron', index: 0 },
    { name: 'Silver', index: 2 },
    { name: 'Gold', index: 3 },
    { name: 'Plat', index: 4 },
    { name: 'Dia', index: 5 },
    { name: 'Master', index: 7 },
  ];

  return (
    <g className="rank-labels">
      {labelsToShow.map(({ name, index }) => {
        const ringRadius = ((index + 0.5) / 8) * RADAR_RADIUS;
        // Position along the top-right spoke (between axis 0 and 1)
        const { x, y } = polarToCartesian(20, ringRadius);
        return (
          <text
            key={name}
            x={x + 4}
            y={y + 1}
            fill="rgba(255,255,255,0.20)"
            fontSize={8}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight={400}
          >
            {name}
          </text>
        );
      })}
    </g>
  );
}

/** Axis labels at the outer edge */
function AxisLabels({ axes }: { axes: BenchmarkRadarPoint[] }) {
  const angleStep = 360 / axes.length;

  return (
    <g className="axis-labels">
      {axes.map((axis, i) => {
        const { x, y } = polarToCartesian(i * angleStep, LABEL_RADIUS);
        const pillarColor = PILLAR_COLORS[axis.pillar] || '#9CA8B3';

        // Adjust text anchor based on position
        const angle = i * angleStep;
        let textAnchor: 'start' | 'middle' | 'end' = 'middle';
        if (angle > 20 && angle < 160) textAnchor = 'start';
        if (angle > 200 && angle < 340) textAnchor = 'end';

        // Slight y offset for top/bottom labels
        const yOffset = angle > 120 && angle < 240 ? 4 : angle < 60 || angle > 300 ? -2 : 1;

        return (
          <g key={axis.subcategory}>
            <text
              x={x}
              y={y + yOffset}
              fill={pillarColor}
              fontSize={11}
              fontFamily="'Rajdhani', sans-serif"
              fontWeight={600}
              textAnchor={textAnchor}
              dominantBaseline="central"
            >
              {axis.subcategory}
            </text>
            {/* Rank badge below label */}
            {axis.scenarioCount > 0 && (
              <text
                x={x}
                y={y + yOffset + 13}
                fill={axis.rankColor}
                fontSize={8}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={400}
                textAnchor={textAnchor}
                dominantBaseline="central"
                opacity={0.7}
              >
                {axis.rank}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** The performance polygon + vertex dots */
function PerformanceShape({ axes }: { axes: BenchmarkRadarPoint[] }) {
  const angleStep = 360 / axes.length;
  const values = axes.map(a => a.percentile);
  const polygonPoints = buildPolygonPoints(values, 100);

  // Generate unique gradient ID
  const gradientId = 'radar-fill-gradient';
  const glowId = 'radar-glow';

  return (
    <g className="performance-shape">
      {/* Gradient + glow definitions */}
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(34,197,94,0.35)" />
          <stop offset="70%" stopColor="rgba(52,211,153,0.15)" />
          <stop offset="100%" stopColor="rgba(34,197,94,0.05)" />
        </radialGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Fill polygon */}
      <polygon
        points={polygonPoints}
        fill={`url(#${gradientId})`}
        stroke="rgba(34,197,94,0.5)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        style={{
          animation: 'radarFadeIn 0.6s ease-out forwards',
        }}
      />

      {/* Glow outline */}
      <polygon
        points={polygonPoints}
        fill="none"
        stroke="rgba(34,197,94,0.15)"
        strokeWidth={4}
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />

      {/* Vertex dots */}
      {axes.map((axis, i) => {
        const radius = (axis.percentile / 100) * RADAR_RADIUS;
        const { x, y } = polarToCartesian(i * angleStep, radius);

        return (
          <circle
            key={axis.subcategory}
            cx={x}
            cy={y}
            r={axis.scenarioCount > 0 ? 4 : 2}
            fill={axis.scenarioCount > 0 ? axis.rankColor : '#5A6872'}
            stroke={axis.scenarioCount > 0 ? 'rgba(255,255,255,0.3)' : 'none'}
            strokeWidth={1}
            style={{
              animation: `radarDotFadeIn 0.3s ease-out ${i * 0.05}s both`,
            }}
          />
        );
      })}
    </g>
  );
}

// ─── Main Component ───

interface BenchmarkRadarProps {
  axes: BenchmarkRadarPoint[];
  overallRank: string;
  overallPercentile: number;
  strongest: BenchmarkRadarPoint | null;
  weakest: BenchmarkRadarPoint | null;
}

export function BenchmarkRadar({
  axes,
  overallRank,
  strongest,
  weakest,
}: BenchmarkRadarProps) {
  return (
    <div className="bg-[#1A2730] border border-white/5 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-['Rajdhani'] text-lg font-bold text-[#ECE8E1] tracking-wide">
          Battle Stats
        </h3>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-['JetBrains_Mono'] font-semibold px-2 py-0.5 rounded"
            style={{
              color: RANK_COLORS[overallRank] || '#9CA8B3',
              backgroundColor: `${RANK_COLORS[overallRank] || '#9CA8B3'}15`,
              border: `1px solid ${RANK_COLORS[overallRank] || '#9CA8B3'}30`,
            }}
          >
            {overallRank}
          </span>
        </div>
      </div>

      <p className="text-[10px] font-['Inter'] text-[#5A6872] mb-3">
        Voltaic S5 · 9-axis benchmark · Rank-normalized percentiles
      </p>

      {/* Radar SVG */}
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="w-full max-w-[340px] h-auto"
          style={{ overflow: 'visible' }}
        >
          <RankRings axisCount={axes.length} />
          <GridSpokes axisCount={axes.length} />
          <RankLabels />
          <PerformanceShape axes={axes} />
          <AxisLabels axes={axes} />

          {/* Center dot */}
          <circle cx={CENTER} cy={CENTER} r={2} fill="rgba(255,255,255,0.15)" />
        </svg>
      </div>

      {/* Insight strip */}
      {strongest && weakest && strongest.subcategory !== weakest.subcategory && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-[#0F1923] rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: strongest.rankColor }}
              />
              <span className="text-[9px] font-['Inter'] text-[#5A6872] uppercase tracking-wider">
                Strongest
              </span>
            </div>
            <p className="text-[#ECE8E1] text-xs font-['Rajdhani'] font-semibold">
              {strongest.subcategory}
            </p>
            <p className="text-[10px] font-['JetBrains_Mono'] mt-0.5" style={{ color: strongest.rankColor }}>
              {strongest.rank} · {strongest.percentile}%
            </p>
          </div>
          <div className="bg-[#0F1923] rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: weakest.rankColor }}
              />
              <span className="text-[9px] font-['Inter'] text-[#5A6872] uppercase tracking-wider">
                Focus Area
              </span>
            </div>
            <p className="text-[#ECE8E1] text-xs font-['Rajdhani'] font-semibold">
              {weakest.subcategory}
            </p>
            <p className="text-[10px] font-['JetBrains_Mono'] mt-0.5" style={{ color: weakest.rankColor }}>
              {weakest.rank} · {weakest.percentile}%
            </p>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes radarFadeIn {
          from { opacity: 0; transform: scale(0.3); transform-origin: ${CENTER}px ${CENTER}px; }
          to { opacity: 1; transform: scale(1); transform-origin: ${CENTER}px ${CENTER}px; }
        }
        @keyframes radarDotFadeIn {
          from { opacity: 0; r: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default BenchmarkRadar;
