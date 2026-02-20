import { Award, Brain, MessageSquare, Sparkles } from 'lucide-react';

export function Coach() {
  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <div className="mb-8">
        <h1 className="font-['Rajdhani'] text-3xl font-bold text-[#ECE8E1]">AI Coach</h1>
        <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">Personalized guidance powered by your performance data</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-[#1C2B36] to-[#2A3A47] border border-[#53CADC]/20 rounded-xl p-6 breathing-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#53CADC]/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#53CADC]" />
            </div>
            <div>
              <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">Training Insights</h3>
              <p className="text-[#5A6872] text-xs font-['Inter']">Based on your recent sessions</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              'Analyze your weakest aim categories',
              'Suggest optimal training routines',
              'Track improvement velocity',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-[#9CA8B3] text-sm font-['Inter']">
                <Sparkles className="w-4 h-4 text-[#53CADC] shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FF4655]/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#FF4655]" />
            </div>
            <div>
              <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1]">Coach Chat</h3>
              <p className="text-[#5A6872] text-xs font-['Inter']">Coming soon</p>
            </div>
          </div>
          <div className="bg-[#0F1923] rounded-xl p-6 text-center">
            <Award className="w-10 h-10 text-[#5A6872] mx-auto mb-3" />
            <p className="text-[#5A6872] text-sm font-['Inter']">Interactive AI coaching conversations will be available here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
