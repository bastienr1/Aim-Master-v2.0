import type { ThemeChipConfig } from '@/constants/debrief-config';

interface ThemeChipProps {
  config: ThemeChipConfig;
  selected: boolean;
  variant: 'primary' | 'secondary';
  onClick: () => void;
}

export function ThemeChip({ config, selected, variant, onClick }: ThemeChipProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      className="transition-all duration-150 rounded-lg text-left"
      style={{
        padding: isPrimary ? '12px 16px' : '8px 12px',
        fontSize: isPrimary ? '14px' : '12px',
        backgroundColor: selected ? 'rgba(83, 202, 220, 0.2)' : '#1C2B36',
        border: `1px solid ${selected ? '#53CADC' : '#2A3A47'}`,
        boxShadow: selected
          ? '0 0 12px rgba(83, 202, 220, 0.2)'
          : 'none',
        transform: selected ? 'scale(1.02)' : 'scale(1)',
        cursor: 'pointer',
      }}
    >
      <span className="font-['Inter']" style={{ color: selected ? '#53CADC' : '#ECE8E1' }}>
        <span className="mr-2">{config.emoji}</span>
        {config.label}
      </span>
    </button>
  );
}
