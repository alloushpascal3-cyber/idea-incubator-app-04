type Props = { active?: boolean; compact?: boolean };

export function OrbitEmblem({ active, compact }: Props) {
  return (
    <div
      className={
        compact ? "relative size-20 sm:size-24" : "relative mx-auto size-44 sm:size-52"
      }
      aria-hidden
    >
      {/* ambient glow */}
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />

      {/* outer orbit with travelling node */}
      <div className="animate-orbit absolute inset-0 rounded-full border border-primary/30">
        <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_16px_3px_var(--gold)]" />
      </div>

      {/* counter orbit */}
      <div className="animate-orbit-reverse absolute inset-3 rounded-full border border-dashed border-chart-4/35">
        <span className="absolute -bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-chart-4 shadow-[0_0_10px_2px_var(--chart-4)]" />
      </div>

      {/* rotating globe of world markets */}
      <div className="absolute inset-6 overflow-hidden rounded-full border border-primary/25 bg-gradient-to-b from-secondary/60 to-background">
        <svg viewBox="0 0 100 100" className="animate-orbit size-full opacity-70">
          <g fill="none" stroke="var(--gold)" strokeWidth="0.8" opacity="0.55">
            <circle cx="50" cy="50" r="46" />
            <ellipse cx="50" cy="50" rx="16" ry="46" />
            <ellipse cx="50" cy="50" rx="32" ry="46" />
            <line x1="4" y1="50" x2="96" y2="50" />
            <ellipse cx="50" cy="50" rx="46" ry="18" />
            <ellipse cx="50" cy="50" rx="46" ry="34" />
          </g>
        </svg>

        {/* market pulse line over the globe */}
        <svg viewBox="0 0 100 60" className="absolute inset-0 m-auto size-full">
          <defs>
            <linearGradient id="emblemG" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--bear)" />
              <stop offset="52%" stopColor="var(--gold)" />
              <stop offset="100%" stopColor="var(--bull)" />
            </linearGradient>
          </defs>
          <polyline
            points="10,44 26,34 38,39 52,22 64,28 82,12"
            fill="none"
            stroke="url(#emblemG)"
            strokeWidth={compact ? 4 : 3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="82" cy="12" r="3" fill="var(--gold)" />
          {/* candles */}
          <g stroke="var(--bull)" strokeWidth="1.6" opacity="0.75">
            <line x1="20" y1="48" x2="20" y2="40" />
            <line x1="46" y1="46" x2="46" y2="32" />
            <line x1="72" y1="44" x2="72" y2="26" />
          </g>
        </svg>
      </div>

      {active && (
        <div className="animate-pulse-soft absolute inset-0 rounded-full border border-primary/25" />
      )}
    </div>
  );
}
