export function SpotterMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="7" width="18" height="20" rx="2" className="stroke-muted" strokeWidth="1.4" />
      <rect x="9" y="4" width="18" height="20" rx="2" className="stroke-fg" strokeWidth="1.4" />
      <path d="M13 10h10M13 14h8M13 18h6" className="stroke-muted" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="22" cy="22" r="6" className="stroke-accent" strokeWidth="1.5" />
      <path d="M22 18v2.2M22 23.8V26M18 22h2.2M23.8 22H26" className="stroke-accent" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
