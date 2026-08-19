import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AnalysisResult, Direction } from "@/lib/scalping-types";

type Props = {
  points: AnalysisResult["projection"];
  direction: Direction;
};

export function ProjectionChart({ points, direction }: Props) {
  const stroke =
    direction === "up" ? "var(--bull)" : direction === "down" ? "var(--bear)" : "var(--neutral)";
  const labeled = points.filter((p) => p.label);

  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">مسار السعر المتوقع</h3>
        <span className="text-[11px] text-muted-foreground">
          توقع مبني على الدراسة — ليس حركة سعر حقيقية
        </span>
      </div>
      <div className="h-56 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(v: number) => `${v}s`}
              stroke="var(--muted-foreground)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              stroke="var(--muted-foreground)"
              fontSize={11}
              width={62}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              labelFormatter={(v) => `+${v as number} ثانية`}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={stroke}
              strokeWidth={2}
              fill="url(#projFill)"
              dot={false}
            />
            {labeled.map((p, i) => (
              <ReferenceDot
                key={i}
                x={p.t}
                y={p.price}
                r={4}
                fill="var(--gold)"
                stroke="var(--background)"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {labeled.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {labeled.map((p, i) => (
            <span
              key={i}
              className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-[11px] text-secondary-foreground"
            >
              +{p.t}ث · {p.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}