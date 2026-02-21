import { Crosshair, TrendingUp, AlertCircle } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer
} from 'recharts';
import { useSkillRadarData } from '@/hooks/useSkillRadarData';

interface SkillRadarProps {
  distribution: { name: string; value: number }[] | null | undefined;
  categoryScores?: { category: string; avg: number }[] | null;
}

export function SkillRadar({ distribution, categoryScores }: SkillRadarProps) {
  const { radarData, strongest, weakest, hasData, dataSource } = useSkillRadarData(distribution, categoryScores);

  return (
    <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">
          Battle Stats
        </h3>
        <span className="text-[11px] font-['Inter'] text-[#5A6872] bg-[#0F1923] px-2 py-1 rounded-full">
          {dataSource === 'scores' ? 'Based on high scores' : 'Based on play volume'}
        </span>
      </div>

      {!hasData ? (
        <div className="text-center py-8">
          <Crosshair className="w-8 h-8 text-[#5A6872] mx-auto mb-2" />
          <p className="text-[#5A6872] text-sm font-['Inter']">
            Sync your scores to unlock Battle Stats
          </p>
        </div>
      ) : (
        <>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                <PolarGrid stroke="#2A3A47" strokeWidth={1} />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fill: '#9CA8B3', fontSize: 11, fontFamily: 'Inter' }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Your Stats"
                  dataKey="value"
                  stroke="#FF4655"
                  fill="#FF4655"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#FF4655', stroke: '#FF4655' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Strength / Weakness callout */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-[#0F1923] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#3DD598]" />
                <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider">
                  Strongest
                </span>
              </div>
              <p className="text-[#ECE8E1] text-sm font-['Inter'] font-medium">
                {strongest.skill}
              </p>
            </div>
            <div className="bg-[#0F1923] rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-[#FFCA3A]" />
                <span className="text-[#5A6872] text-[10px] font-['Inter'] uppercase tracking-wider">
                  Focus Area
                </span>
              </div>
              <p className="text-[#ECE8E1] text-sm font-['Inter'] font-medium">
                {weakest.skill}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
