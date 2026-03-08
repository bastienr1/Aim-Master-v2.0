export interface MomentumContext {
  line1: string;
  line2: string;
}

export function getMomentumContext(
  state: string | undefined,
  delta: number | undefined
): MomentumContext {
  if (state === 'declining') {
    return {
      line1: `Scores dipped ${Math.abs(delta || 0).toFixed(1)}% — this is normal during growth phases.`,
      line2: 'A short focused session rebuilds momentum. Quality over volume.',
    };
  }
  if (state === 'improving') {
    return {
      line1: 'Momentum is building. This is the time to push into weak areas.',
      line2: 'Your confidence is high — channel it into challenging scenarios.',
    };
  }
  if (state === 'steady') {
    return {
      line1: 'Consistent performance — you\'re holding your gains.',
      line2: 'Try increasing difficulty or switching to weakness-focused scenarios.',
    };
  }
  return {
    line1: 'Building your performance profile...',
    line2: 'Keep training — patterns emerge after a few sessions.',
  };
}
