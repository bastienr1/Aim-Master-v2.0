interface ScoreSparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

export function ScoreSparkline({ data, width = 200, height = 40 }: ScoreSparklineProps) {
  if (data.length < 2) return null;

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = data
    .map((val, i) => {
      const x = padding + (i / (data.length - 1)) * innerW;
      const y = padding + (1 - val) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  // Gradient fill path (closed shape under the line)
  const fillPoints =
    `${padding},${padding + innerH} ` +
    points +
    ` ${padding + innerW},${padding + innerH}`;

  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#53CADC" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#53CADC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke="#53CADC"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
