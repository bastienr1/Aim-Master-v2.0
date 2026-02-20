import { useMemo } from 'react';

export interface RadarDataPoint {
  skill: string;
  value: number;
  fullMark: number;
}

export interface SkillRadarResult {
  radarData: RadarDataPoint[];
  strongest: RadarDataPoint;
  weakest: RadarDataPoint;
  hasData: boolean;
}

/**
 * Transforms category distribution counts into a 6-axis radar chart dataset.
 * Normalizes to 0-100 scale. Derives Speed, Precision, Stability from
 * primary categories when subcategory data isn't available.
 */
export function useSkillRadarData(
  distribution: { name: string; value: number }[] | null | undefined
): SkillRadarResult {
  return useMemo(() => {
    if (!distribution?.length) {
      const empty: RadarDataPoint = { skill: 'N/A', value: 0, fullMark: 100 };
      return { radarData: [], strongest: empty, weakest: empty, hasData: false };
    }

    const total = distribution.reduce((a, b) => a + b.value, 0) || 1;

    const getCatValue = (name: string): number => {
      const found = distribution.find(d =>
        d.name.toLowerCase().includes(name.toLowerCase())
      );
      return found ? Math.round((found.value / total) * 100) : 0;
    };

    const radarData: RadarDataPoint[] = [
      { skill: 'Clicking',   value: getCatValue('click'),  fullMark: 100 },
      { skill: 'Tracking',   value: getCatValue('track'),  fullMark: 100 },
      { skill: 'Switching',  value: getCatValue('switch'), fullMark: 100 },
      { skill: 'Speed',      value: Math.min(getCatValue('speed')   || Math.round(getCatValue('click') * 0.8),  100), fullMark: 100 },
      { skill: 'Precision',  value: Math.min(getCatValue('precise') || Math.round(getCatValue('track') * 0.85), 100), fullMark: 100 },
      { skill: 'Stability',  value: Math.min(getCatValue('stab')    || Math.round(getCatValue('switch') * 0.9), 100), fullMark: 100 },
    ];

    const weakest  = radarData.reduce((a, b) => a.value < b.value ? a : b);
    const strongest = radarData.reduce((a, b) => a.value > b.value ? a : b);

    return { radarData, strongest, weakest, hasData: true };
  }, [distribution]);
}
