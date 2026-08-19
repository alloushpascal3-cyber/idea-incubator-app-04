type Props = { items: string[] };

export function NewsTicker({ items }: Props) {
  const list = items.length ? items : ["في انتظار بيانات التحليل…"];
  const doubled = [...list, ...list];

  return (
    <div className="relative overflow-hidden border-y border-border bg-card/70 py-2 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-card to-transparent" />
      <div className="animate-ticker flex w-max items-center gap-8 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-xs sm:text-sm">
            <span
              className={
                "inline-block size-1.5 rounded-full " +
                (i % 3 === 0 ? "bg-bull" : i % 3 === 1 ? "bg-primary" : "bg-bear")
              }
            />
            <span className="text-muted-foreground">{item}</span>
          </span>
        ))}
      </div>
    </div>
  );
}