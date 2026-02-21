import { VerifiedShieldIcon } from '@/components/icons/VerifiedShieldIcon';

interface VerifiedBadgeProps {
  variant?: 'inline' | 'tag' | 'header';
  className?: string;
}

export function VerifiedBadge({ variant = 'tag', className }: VerifiedBadgeProps) {
  if (variant === 'inline') {
    // Just the icon, no label — for tight spaces
    return <VerifiedShieldIcon size={16} className={className} />;
  }

  if (variant === 'header') {
    // Larger badge for active program header
    return (
      <div className={`flex items-center gap-2 ${className || ''}`}>
        <VerifiedShieldIcon size={20} />
        <span className="text-[#FFCA3A] text-xs font-bold font-['Inter'] uppercase tracking-wider">
          Verified Learning Path
        </span>
      </div>
    );
  }

  // Default: tag style — used in cards and search results
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold font-['Inter'] uppercase tracking-wide ${className || ''}`}
      style={{ backgroundColor: 'rgba(255, 202, 58, 0.12)', color: '#FFCA3A' }}
    >
      <VerifiedShieldIcon size={12} />
      Verified
    </span>
  );
}
