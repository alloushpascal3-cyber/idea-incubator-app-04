type Props = { active?: boolean; compact?: boolean };

/**
 * Luxury emblem: a faceted gold/neon gyroscope diamond with slow rotating rings.
 */
export function OrbitEmblem({ active, compact }: Props) {
  return (
    <div
      className={compact ? "relative size-20 sm:size-24" : "relative mx-auto size-44 sm:size-52"}
      aria-hidden
    >
      {/* ambient glow */}
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute inset-4 rounded-full bg-neon/10 blur-2xl" />

      {/* outer thin gold ring */}
      <div className="animate-orbit absolute inset-0 rounded-full border border-primary/25">
        <span className="absolute -top-[3px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_14px_3px_var(--gold)]" />
      </div>

      {/* neon gyroscope ring */}
      <div className="animate-orbit-reverse absolute inset-2 rounded-full border border-dashed border-neon/40" />

      {/* faceted diamond core */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="emGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.95 0.06 95)" />
            <stop offset="50%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="oklch(0.62 0.12 65)" />
          </linearGradient>
          <linearGradient id="emNeon" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--neon)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* diamond silhouette */}
        <g className="animate-pulse-soft">
          <polygon
            points="50,16 74,42 50,84 26,42"
            fill="url(#emGold)"
            opacity="0.16"
            stroke="url(#emGold)"
            strokeWidth="1.2"
          />
          {/* facets */}
          <g stroke="url(#emNeon)" strokeWidth="0.9" fill="none" opacity="0.85">
            <line x1="26" y1="42" x2="74" y2="42" />
            <line x1="50" y1="16" x2="50" y2="84" />
            <line x1="38" y1="29" x2="43" y2="42" />
            <line x1="62" y1="29" x2="57" y2="42" />
            <line x1="26" y1="42" x2="50" y2="84" />
            <line x1="74" y1="42" x2="50" y2="84" />
          </g>
          <circle cx="50" cy="42" r="2.2" fill="var(--gold)" />
        </g>
      </svg>

      {/* soft inner halo */}
      <div className="absolute inset-8 rounded-full border border-primary/15" />

      {active && (
        <div className="animate-pulse-soft absolute inset-0 rounded-full border border-neon/30" />
      )}
    </div>
  );
}
