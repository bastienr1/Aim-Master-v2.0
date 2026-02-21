import { EMOJI_REACTIONS } from '@/constants/debrief-config';

interface EmojiReactionRowProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

export function EmojiReactionRow({ selected, onSelect }: EmojiReactionRowProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {EMOJI_REACTIONS.map((reaction) => {
        const isSelected = selected === reaction.id;
        return (
          <button
            key={reaction.id}
            onClick={() => onSelect(reaction.id)}
            className="flex flex-col items-center gap-1 transition-all duration-150"
            style={{
              cursor: 'pointer',
            }}
          >
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center text-xl transition-all duration-150"
              style={{
                backgroundColor: isSelected ? 'rgba(83, 202, 220, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                border: isSelected ? '2px solid #53CADC' : '2px solid transparent',
                boxShadow: isSelected ? '0 0 12px rgba(83, 202, 220, 0.3)' : 'none',
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {reaction.emoji}
            </div>
            <span
              className="text-[10px] font-['Inter'] transition-colors duration-150"
              style={{
                color: isSelected ? '#53CADC' : '#5A6872',
                opacity: isSelected ? 1 : 0.7,
              }}
            >
              {isSelected ? reaction.label : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
