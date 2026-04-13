export function DefaultBanner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="400" height="200" fill="#0f1319" />
      {/* Grid lines */}
      <line x1="0" y1="50" x2="400" y2="50" stroke="#1a1f2e" strokeWidth="0.5" />
      <line x1="0" y1="100" x2="400" y2="100" stroke="#1a1f2e" strokeWidth="0.5" />
      <line x1="0" y1="150" x2="400" y2="150" stroke="#1a1f2e" strokeWidth="0.5" />
      <line x1="100" y1="0" x2="100" y2="200" stroke="#1a1f2e" strokeWidth="0.5" />
      <line x1="200" y1="0" x2="200" y2="200" stroke="#1a1f2e" strokeWidth="0.5" />
      <line x1="300" y1="0" x2="300" y2="200" stroke="#1a1f2e" strokeWidth="0.5" />
      {/* Glow */}
      <ellipse cx="200" cy="100" rx="120" ry="60" fill="url(#glow)" />
      {/* Text */}
      <text
        x="200"
        y="105"
        textAnchor="middle"
        fill="#3b3f52"
        fontSize="16"
        fontWeight="900"
        fontFamily="system-ui"
        letterSpacing="8"
      >
        S-RANK ARENA
      </text>
      <defs>
        <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
