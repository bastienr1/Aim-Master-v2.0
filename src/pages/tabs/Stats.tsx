import { BarChart3, TrendingUp, Award } from 'lucide-react';

export function Stats() {
  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <div className="mb-8">
        <h1 className="font-['Rajdhani'] text-3xl font-bold text-[#ECE8E1]">Statistics</h1>
        <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">Deep dive into your performance data</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Overall Accuracy', value: '—', icon: Award, color: '#3DD598' },
          { label: 'Avg. Score Trend', value: '—', icon: TrendingUp, color: '#53CADC' },
          { label: 'Total Sessions', value: '—', icon: BarChart3, color: '#FF4655' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              <span className="text-[#9CA8B3] text-sm font-['Inter']">{stat.label}</span>
            </div>
            <p className="font-['JetBrains_Mono'] text-3xl font-bold text-[#ECE8E1]">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#1C2B36] border border-white/10 rounded-xl p-12 text-center">
        <BarChart3 className="w-16 h-16 text-[#5A6872] mx-auto mb-4" />
        <h3 className="font-['Rajdhani'] text-xl font-semibold text-[#9CA8B3]">Detailed Analytics Coming Soon</h3>
        <p className="text-[#5A6872] text-sm mt-2 font-['Inter'] max-w-md mx-auto">
          Scenario breakdowns, accuracy heatmaps, and progression charts will appear here once you have more data.
        </p>
      </div>
    </div>
  );
}
