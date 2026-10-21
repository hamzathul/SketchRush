export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="brand-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b8f36b" />
          <stop offset="55%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill="#111726" />
      <rect width="64" height="64" rx="17" fill="url(#brand-gradient)" opacity="0.1" />
      <path
        d="M12 42c7-16 13-20 17-12s8 10 12 2 7-10 11-4"
        fill="none"
        stroke="url(#brand-gradient)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="49" cy="18" r="4" fill="#b8f36b" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-lg font-bold tracking-tight ${className}`}>
      Sketch<span className="text-lime">Rush</span>
    </span>
  );
}
