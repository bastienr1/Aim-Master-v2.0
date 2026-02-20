import { Brain } from 'lucide-react';

interface EmptyStateProps {
  onStartCheckin: () => void;
}

export function EmptyState({ onStartCheckin }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <Brain
        className="w-12 h-12 mb-5"
        style={{ color: '#53CADC', opacity: 0.4 }}
      />
      <h2 className="font-['Rajdhani'] text-[22px] font-bold text-[#ECE8E1] mb-2">
        Your mental game journey starts here
      </h2>
      <p className="text-sm font-['Inter'] text-[#9CA8B3] max-w-[360px] leading-relaxed mb-6">
        Complete your first pre-training check-in to start tracking your mental performance patterns.
      </p>
      <button
        onClick={onStartCheckin}
        className="px-6 py-3 rounded-lg text-sm font-semibold font-['Inter'] text-white transition-all duration-200 hover:brightness-110"
        style={{ backgroundColor: '#53CADC' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = 'brightness(1.1)';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(83, 202, 220, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'brightness(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Start Check-in
      </button>
    </div>
  );
}
