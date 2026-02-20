import { Brain } from 'lucide-react';

interface CheckinButtonProps {
  onClick: () => void;
}

export function CheckinButton({ onClick }: CheckinButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 hover:bg-[#53CADC]/10"
      style={{
        borderColor: '#53CADC',
        color: '#53CADC',
      }}
    >
      <Brain className="w-3.5 h-3.5" />
      <span className="text-xs font-semibold font-['Inter']">Check-in</span>
    </button>
  );
}
