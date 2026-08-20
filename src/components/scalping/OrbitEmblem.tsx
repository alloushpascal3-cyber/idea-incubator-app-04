type Props = { active?: boolean; compact?: boolean };

export function OrbitEmblem({ active, compact }: Props) {
  return (
    <div
      className={
        compact ? "relative size-16 sm:size-20" : "relative mx-auto size-40 sm:size-48"
      }
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
      <div className="animate-orbit absolute inset-0 rounded-full border border-primary/35">
        <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_14px_2px_var(--gold)]" />
      </div>
      <div className="animate-orbit-reverse absolute inset-4 rounded-full border border-chart-4/40">
        <span className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-chart-4" />
      </div>
      <div className="absolute inset-8 rounded-full border border-bull/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 64 64" className={compact ? "size-7 sm:size-8" : "size-16 sm:size-20"}>
          <defs>
            <linearGradient id="emblemG" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--bear)" />
              <stop offset="55%" stopColor="var(--gold)" />
              <stop offset="100%" stopColor="var(--bull)" />
            </linearGradient>
          </defs>
          <polyline
            points="6,48 18,36 26,42 38,22 46,28 58,12"
            fill="none"
            stroke="url(#emblemG)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="58" cy="12" r="3.5" fill="var(--gold)" />
        </svg>
      </div>
      {active && (
        <div className="animate-pulse-soft absolute inset-0 rounded-full border border-primary/25" />
      )}
    </div>
  );
}