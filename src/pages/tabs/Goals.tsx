import { TrendingUp, Target, CheckCircle2, Circle } from 'lucide-react';

export function Goals() {
  return (
    <div className="p-6 lg:p-8 animate-slide-up">
      <div className="mb-8">
        <h1 className="font-['Rajdhani'] text-3xl font-bold text-[#ECE8E1]">Goals & Milestones</h1>
        <p className="text-[#9CA8B3] text-sm mt-1 font-['Inter']">Set targets and track your progress</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
          <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#FF4655]" />
            Active Goals
          </h3>
          <div className="space-y-3">
            {[
              { text: 'Reach Diamond in Voltaic', done: false },
              { text: 'Play 5 sessions this week', done: false },
              { text: 'Improve tracking by 10%', done: false },
            ].map((goal, i) => (
              <div key={i} className="flex items-center gap-3 bg-[#0F1923] rounded-xl px-4 py-3">
                {goal.done ? (
                  <CheckCircle2 className="w-5 h-5 text-[#3DD598] shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-[#5A6872] shrink-0" />
                )}
                <span className={`text-sm font-['Inter'] ${goal.done ? 'text-[#3DD598] line-through' : 'text-[#ECE8E1]'}`}>
                  {goal.text}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#2A3A47] border border-white/10 rounded-xl p-6">
          <h3 className="font-['Rajdhani'] text-lg font-semibold text-[#ECE8E1] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#3DD598]" />
            Milestones
          </h3>
          <div className="bg-[#0F1923] rounded-xl p-8 text-center">
            <TrendingUp className="w-10 h-10 text-[#5A6872] mx-auto mb-3" />
            <p className="text-[#5A6872] text-sm font-['Inter']">Goal tracking and milestone celebrations coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
