import type { AnalysisResult, Direction } from "@/lib/scalping-types";

type Props = {
  points: AnalysisResult["projection"];
  direction: Direction;
  asset: string;
  compactRows?: number;
};

/**
 * Read-only view of the projection the analysis already produced.
 * No math here — it only formats the existing points.
 */
export function ProjectionTable({ points, direction, asset, compactRows }: Props) {
  const rows = compactRows ? points.slice(0, compactRows) : points;
  const tone =
    direction === "up" ? "text-bull" : direction === "down" ? "text-bear" : "text-neutral";
  const first = points[0]?.price;

  return (
    <div className="panel neon-frame overflow-hidden">
      <div className="hairline flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-semibold">جدول المسار المتوقع</h3>
        <span className="font-mono text-[11px] text-primary">{asset}</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-right text-[11px]">
          <thead className="sticky top-0 bg-card/95 text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-3 py-1.5 font-normal">الزمن</th>
              <th className="px-3 py-1.5 font-normal">السعر المتوقع</th>
              <th className="px-3 py-1.5 font-normal">التغيّر</th>
              <th className="px-3 py-1.5 font-normal">ملاحظة</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((p, i) => {
              const delta = first != null ? p.price - first : 0;
              return (
                <tr key={i} className="border-t border-border/40">
                  <td className="px-3 py-1.5 text-muted-foreground">+{p.t}ث</td>
                  <td className={"px-3 py-1.5 " + tone}>{p.price}</td>
                  <td
                    className={
                      "px-3 py-1.5 " +
                      (delta > 0 ? "text-bull" : delta < 0 ? "text-bear" : "text-muted-foreground")
                    }
                  >
                    {delta > 0 ? "+" : ""}
                    {Number(delta.toFixed(5))}
                  </td>
                  <td className="px-3 py-1.5 font-sans text-primary">{p.label ?? "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  لا توجد نقاط مسار متوقعة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
