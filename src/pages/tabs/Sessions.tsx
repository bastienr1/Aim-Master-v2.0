import { BookOpen, Clock, Flame } from 'lucide-react';

export function Sessions() {
  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <div className="mb-8">
        <h1 className="font-['Rajdhani'] text-3xl font-bold text-[#ECE8E1]">Session History</h1>
        <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">Review your past training sessions</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'This Week', value: '—', icon: Flame, color: '#FF4655' },
          { label: 'Avg. Duration', value: '—', icon: Clock, color: '#53CADC' },
          { label: 'Total Sessions', value: '—', icon: BookOpen, color: '#FFCA3A' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#2A3A47] border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              <span className="text-[#9CA8B3] text-xs font-['Inter']">{stat.label}</span>
            </div>
            <p className="font-['JetBrains_Mono'] text-2xl font-bold text-[#ECE8E1]">{stat.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-[#1C2B36] border border-white/10 rounded-xl p-12 text-center">
        <BookOpen className="w-16 h-16 text-[#5A6872] mx-auto mb-4" />
        <h3 className="font-['Rajdhani'] text-xl font-semibold text-[#9CA8B3]">Session Log Coming Soon</h3>
        <p className="text-[#5A6872] text-sm mt-2 font-['Inter'] max-w-md mx-auto">
          Detailed session breakdowns with scenario-by-scenario analysis will appear here.
        </p>
      </div>
    </div>
  );
}
