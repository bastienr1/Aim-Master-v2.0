import { Bookmark, BookmarkCheck } from 'lucide-react';
import { TEXT, SEMANTIC } from '@/constants/theme';

interface SaveDrillButtonProps {
  saved: boolean;
  busy?: boolean;
  onToggle(): void;
  size?: number;
}

/** Bookmark toggle for a drill row. Filled when saved; the filled one removes the save. */
export function SaveDrillButton({ saved, busy = false, onToggle, size = 13 }: SaveDrillButtonProps) {
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={saved}
      title={saved ? 'Remove saved drill' : 'Save drill'}
      style={{
        background: 'transparent',
        border: 'none',
        padding: '2px',
        margin: '-2px',
        cursor: busy ? 'wait' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        color: saved ? SEMANTIC.mechanics : TEXT.label,
        opacity: busy ? 0.5 : 1,
        flexShrink: 0,
      }}
    >
      <Icon size={size} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}
