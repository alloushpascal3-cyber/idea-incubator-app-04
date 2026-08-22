export type TickerItem = { text: string; tone?: "gold" | "bull" | "bear" | "info" | "muted" };

type Props = { items: TickerItem[] };

const TONE: Record<string, { dot: string; text: string }> = {
  gold: { dot: "bg-primary", text: "text-primary" },
  bull: { dot: "bg-bull", text: "text-bull" },
  bear: { dot: "bg-bear", text: "text-bear" },
  info: { dot: "bg-chart-4", text: "text-chart-4" },
  muted: { dot: "bg-neutral", text: "text-muted-foreground" },
};

export function NewsTicker({ items }: Props) {
  const list: TickerItem[] = items.length
    ? items
    : [{ text: "في انتظار بيانات التحليل…", tone: "muted" }];
  const doubled = [...list, ...list];

  return (
    <div className="relative overflow-hidden border-y border-border bg-card/70 py-2 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-card to-transparent" />
      <div
        className="animate-ticker flex w-max items-center gap-7 whitespace-nowrap"
        style={{
          animationDuration: `${Math.max(
            24,
            list.reduce((n, i) => n + i.text.length, 0) * 0.42,
          )}s`,
        }}
      >
        {doubled.map((item, i) => {
          const tone = TONE[item.tone ?? "muted"]!;
          return (
            <span key={i} className="flex items-center gap-2 text-[11px] sm:text-xs">
              <span className={"inline-block size-1.5 rounded-full " + tone.dot} />
              <span className={tone.text}>{item.text}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}