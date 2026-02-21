interface VerifiedShieldIconProps {
  size?: number;
  className?: string;
}

export function VerifiedShieldIcon({ size = 20, className }: VerifiedShieldIconProps) {
  // At small sizes (≤20px), hide crosshair details for clarity
  const showDetail = size > 20;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {showDetail && (
        <defs>
          <linearGradient id="shieldGold" x1="20" y1="8" x2="60" y2="72" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFCA3A" />
            <stop offset="100%" stopColor="#E5A800" />
          </linearGradient>
        </defs>
      )}
      {/* Outer shield */}
      <path
        d="M40 6 L62 16 C64 17 66 20 66 22 L66 38 C66 52 54 64 40 72 C26 64 14 52 14 38 L14 22 C14 20 16 17 18 16 Z"
        fill={showDetail ? "url(#shieldGold)" : "#FFCA3A"}
      />
      {/* Inner shield */}
      <path
        d="M40 12 L58 20 C59 20.5 60 22 60 23 L60 37 C60 48 50 58 40 65 C30 58 20 48 20 37 L20 23 C20 22 21 20.5 22 20 Z"
        fill="#1C2B36"
      />
      {/* Crosshair ring — only at larger sizes */}
      {showDetail && (
        <>
          <circle cx="40" cy="36" r="13" stroke="#FFCA3A" strokeWidth="1.5" fill="none" opacity="0.4" />
          <line x1="40" y1="21" x2="40" y2="27" stroke="#FFCA3A" strokeWidth="1.2" opacity="0.3" />
          <line x1="40" y1="45" x2="40" y2="51" stroke="#FFCA3A" strokeWidth="1.2" opacity="0.3" />
          <line x1="25" y1="36" x2="31" y2="36" stroke="#FFCA3A" strokeWidth="1.2" opacity="0.3" />
          <line x1="49" y1="36" x2="55" y2="36" stroke="#FFCA3A" strokeWidth="1.2" opacity="0.3" />
        </>
      )}
      {/* Checkmark */}
      <polyline
        points="32,36 38,43 50,29"
        stroke="#FFCA3A"
        strokeWidth={showDetail ? "3.5" : "5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
