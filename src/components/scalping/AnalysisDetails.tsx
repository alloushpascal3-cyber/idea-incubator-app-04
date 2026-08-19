import type { AnalysisResult, Direction } from "@/lib/scalping-types";

const dirLabel: Record<Direction, string> = { up: "صعود", down: "هبوط", none: "لا أفضلية" };

function dirClass(d: Direction) {
  return d === "up" ? "text-bull" : d === "down" ? "text-bear" : "text-muted-foreground";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary">{title}</h3>
      {children}
    </section>
  );
}

export function AnalysisDetails({ result }: { result: AnalysisResult }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Section title="اتجاهات الفريمات">
        <ul className="space-y-2 text-sm">
          {result.frames.map((f, i) => (
            <li key={i} className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
              <span className="font-mono text-xs text-muted-foreground">{f.timeframe}</span>
              <span className="flex-1 text-xs text-muted-foreground">{f.note}</span>
              <span className={"text-xs font-semibold " + dirClass(f.trend)}>
                {dirLabel[f.trend]}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="المناطق والارتدادات">
        <ul className="space-y-3 text-sm">
          {result.zones.map((z, i) => (
            <li key={i} className="rounded-lg border border-border/60 bg-secondary/30 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{z.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {z.rangeLow} – {z.rangeHigh}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>اختبارات: {z.tests}</span>
                <span>ارتدادات: {z.bounces}</span>
                <span>اختراقات: {z.breaks}</span>
                <span>آخر اختبار: {z.lastTest}</span>
                <span>{z.stillValid ? "ما زالت فعّالة" : "أصبحت ضعيفة"}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, z.strength))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="السرعة والتسارع والزمن">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[11px] text-muted-foreground">السرعة الحالية</dt>
            <dd className="font-mono">{result.speed.current}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">متوسط السرعة</dt>
            <dd className="font-mono">{result.speed.average}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">النسبة للمتوسط</dt>
            <dd className="font-mono">×{result.speed.ratio}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-muted-foreground">التسارع</dt>
            <dd className="font-mono">
              {result.speed.acceleration}{" "}
              <span className="text-[11px] text-muted-foreground">
                (
                {result.speed.accelerationState === "accelerating"
                  ? "تسارع"
                  : result.speed.accelerationState === "decelerating"
                    ? "تباطؤ"
                    : "ثابت"}
                )
              </span>
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">{result.speed.note}</p>
        <div className="mt-3 rounded-lg border border-border/60 bg-secondary/30 p-3 text-xs">
          <div className="flex justify-between">
            <span>الهدف: {result.arrival.targetLabel}</span>
            <span className="font-mono">المسافة {result.arrival.distance}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>الزمن المتوقع: {result.arrival.expectedSeconds}ث</span>
            <span>المتاح: {result.arrival.availableSeconds}ث</span>
          </div>
          <p className={"mt-2 font-semibold " + (result.arrival.sufficient ? "text-bull" : "text-bear")}>
            {result.arrival.sufficient ? "السرعة كافية" : "السرعة غير كافية"}
          </p>
        </div>
      </Section>

      <Section title="التصحيح أو الانعكاس">
        <p className="text-sm font-medium">
          {result.structure === "reversal"
            ? "انعكاس محتمل"
            : result.structure === "correction"
              ? "تصحيح محتمل"
              : result.structure === "trend-continuation"
                ? "استمرار الاتجاه"
                : "الهيكل غير واضح"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{result.structureNote}</p>
      </Section>

      <Section title="مقارنة الصور المتتابعة">
        <ol className="space-y-2 text-xs">
          {result.sequence.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-primary">
                {s.from}→{s.to}
              </span>
              <span className="text-muted-foreground">{s.change}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="المؤشرات (تأكيد فقط)">
        <ul className="space-y-2 text-sm">
          {result.indicators.map((ind, i) => (
            <li key={i} className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
              <span>{ind.name}</span>
              <span className="flex-1 text-xs text-muted-foreground">{ind.reading}</span>
              <span className={"text-xs font-semibold " + dirClass(ind.bias)}>
                {dirLabel[ind.bias]}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="أسباب رفع الثقة">
        <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
          {result.confidenceUp.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Section>

      <Section title="أسباب خفض الثقة">
        <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
          {result.confidenceDown.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Section>

      <Section title="توزيع درجة الثقة">
        <ul className="space-y-2 text-xs">
          {(
            [
              ["سلوك السعر والمناطق", result.scoreBreakdown.priceAction],
              ["السرعة والتسارع والزمن", result.scoreBreakdown.speed],
              ["توافق الفريمات", result.scoreBreakdown.alignment],
              ["المؤشرات", result.scoreBreakdown.indicators],
            ] as const
          ).map(([label, value]) => (
            <li key={label}>
              <div className="flex justify-between">
                <span>{label}</span>
                <span className="font-mono">{value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}