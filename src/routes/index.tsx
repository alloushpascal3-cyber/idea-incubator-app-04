import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2, Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AnalysisDetails } from "@/components/scalping/AnalysisDetails";
import { NewsTicker } from "@/components/scalping/NewsTicker";
import { ProjectionChart } from "@/components/scalping/ProjectionChart";
import { ShotUploader } from "@/components/scalping/ShotUploader";
import { Button } from "@/components/ui/button";
import { analyzeChartSequence, classifyChartShots } from "@/lib/scalping.functions";
import {
  STUDY_DURATIONS,
  TRADE_DURATIONS,
  type AnalysisResult,
  type ChartShot,
  type Timeframe,
  type TimeSlot,
} from "@/lib/scalping-types";
import { useSettings } from "@/lib/use-settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "محلل السكالبينغ — قراءة الشارت وإصدار الاتجاه والثقة" },
      {
        name: "description",
        content:
          "أداة تحليل سكالبينغ: ارفع صور الشارت المتتابعة ليحلل التطبيق سلوك السعر والمناطق والسرعة والزمن ثم يصدر صعود أو هبوط أو لا أفضلية مع درجة ثقة.",
      },
      { property: "og:title", content: "محلل السكالبينغ — الاتجاه ودرجة الثقة" },
      {
        property: "og:description",
        content:
          "تحليل صور الشارت عبر الفريمات: المناطق، الارتدادات، السرعة، التسارع، الزمن المتوقع، ودرجة ثقة واضحة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Phase = "idle" | "classifying" | "studying" | "analyzing" | "done";

function guessFromName(name: string): { timeframe: Timeframe | "unknown"; slot: TimeSlot | "unknown" } {
  const lower = name.toLowerCase();
  const tf = (["4h", "1h", "30m", "15m", "10m", "5m", "1m"] as const).find((t) => lower.includes(t));
  const slot = (["t45", "t30", "t15", "t0"] as const).find((s) => lower.includes(s));
  return {
    timeframe: tf ? ((tf === "4h" ? "4H" : tf === "1h" ? "1H" : tf) as Timeframe) : "unknown",
    slot: slot ? (slot.toUpperCase() as TimeSlot) : "unknown",
  };
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
    reader.readAsDataURL(file);
  });
}

function Home() {
  const { settings, loaded } = useSettings();
  const classify = useServerFn(classifyChartShots);
  const analyze = useServerFn(analyzeChartSequence);

  const [asset, setAsset] = useState("EUR/USD");
  const [tradeDuration, setTradeDuration] = useState(5);
  const [studyDuration, setStudyDuration] = useState(60);
  const [shots, setShots] = useState<ChartShot[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const runRef = useRef(0);

  useEffect(() => {
    if (!loaded) return;
    setAsset(settings.assets[0] ?? "EUR/USD");
    setTradeDuration(settings.tradeDuration);
    setStudyDuration(settings.studyDuration);
  }, [loaded, settings.assets, settings.tradeDuration, settings.studyDuration]);

  const addShots = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const next: ChartShot[] = [];
    for (const file of Array.from(files)) {
      const dataUrl = await readFile(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        dataUrl,
        ...guessFromName(file.name),
      });
    }
    setShots((prev) => [...prev, ...next]);
  }, []);

  const patchShot = useCallback((id: string, patch: Partial<ChartShot>) => {
    setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeShot = useCallback((id: string) => {
    setShots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const imagesStatus = useMemo(() => {
    if (shots.length === 0) return "لا صور";
    const unknown = shots.filter((s) => s.timeframe === "unknown" || s.slot === "unknown").length;
    if (unknown > 0) return `${unknown} بحاجة لتحديد`;
    return "مكتملة";
  }, [shots]);

  const runAnalysis = useCallback(
    async (list: ChartShot[]) => {
      setPhase("analyzing");
      try {
        const data = await analyze({
          data: {
            asset,
            settings: { ...settings, tradeDuration, studyDuration },
            images: list.map((s) => ({
              id: s.id,
              timeframe: s.timeframe,
              slot: s.slot,
              dataUrl: s.dataUrl,
            })),
          },
        });
        setResult(data);
        setPhase("done");
      } catch (error) {
        setPhase("idle");
        toast.error(error instanceof Error ? error.message : "فشل التحليل");
      }
    },
    [analyze, asset, settings, tradeDuration, studyDuration],
  );

  const start = useCallback(async () => {
    if (shots.length < 2) {
      toast.error("ارفع صورتين متتابعتين على الأقل");
      return;
    }
    setResult(null);
    setShowDetails(false);
    const runId = ++runRef.current;
    let list = shots;

    if (settings.autoClassify && shots.some((s) => s.timeframe === "unknown" || s.slot === "unknown")) {
      setPhase("classifying");
      try {
        const { results } = await classify({
          data: { images: shots.map((s) => ({ id: s.id, dataUrl: s.dataUrl })) },
        });
        list = shots.map((s) => {
          const hit = results.find((r) => r.id === s.id);
          return hit
            ? {
                ...s,
                timeframe: s.timeframe === "unknown" ? hit.timeframe : s.timeframe,
                slot: s.slot === "unknown" ? hit.slot : s.slot,
              }
            : s;
        });
        setShots(list);
        if (list.some((s) => s.timeframe === "unknown" || s.slot === "unknown")) {
          toast.warning("بعض الصور تحتاج تحديد الفريم أو الزمن يدويًا");
        }
      } catch {
        toast.warning("تعذّر التصنيف التلقائي، سيتم استخدام التصنيف الحالي");
      }
      if (runRef.current !== runId) return;
    }

    setPhase("studying");
    setRemaining(studyDuration);

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (runRef.current === runId) void runAnalysis(list);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [shots, settings.autoClassify, classify, studyDuration, runAnalysis]);

  const busy = phase === "classifying" || phase === "studying" || phase === "analyzing";
  const dirText =
    result?.direction === "up" ? "صعود" : result?.direction === "down" ? "هبوط" : "لا أفضلية";
  const dirColor =
    result?.direction === "up" ? "text-bull" : result?.direction === "down" ? "text-bear" : "text-neutral";

  return (
    <div className="min-h-screen pb-16">
      <header className="hairline sticky top-0 z-20 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="gold-text text-lg font-bold sm:text-xl">محلل السكالبينغ</h1>
            <p className="text-[11px] text-muted-foreground">أداة تحليل فقط — لا تنفيذ صفقات</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/settings">
              <Settings2 className="size-4" />
              الإعدادات
            </Link>
          </Button>
        </div>
      </header>

      <NewsTicker items={result?.headlines ?? []} />

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <section className="panel gold-ring p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="المنصة">
              <div className="rounded-lg border border-border bg-input/40 px-3 py-2 text-sm">
                {settings.platform}
              </div>
            </Field>
            <Field label="الأصل">
              <Picker value={asset} onChange={setAsset} options={settings.assets} />
            </Field>
            <Field label="مدة الصفقة">
              <Picker
                value={String(tradeDuration)}
                onChange={(v) => setTradeDuration(Number(v))}
                options={TRADE_DURATIONS.map((d) => String(d))}
                render={(v) => `${v} دقيقة`}
              />
            </Field>
            <Field label="مدة الدراسة">
              <Picker
                value={String(studyDuration)}
                onChange={(v) => setStudyDuration(Number(v))}
                options={STUDY_DURATIONS.map((d) => String(d))}
                render={(v) => `${v} ثانية`}
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span>
                حالة الصور: <span className="text-foreground">{imagesStatus}</span>
              </span>
              <span>
                المؤقت:{" "}
                <span className={"font-mono text-base " + (phase === "studying" ? "text-primary" : "")}>
                  {String(Math.floor(remaining / 60)).padStart(2, "0")}:
                  {String(remaining % 60).padStart(2, "0")}
                </span>
              </span>
            </div>
            <Button onClick={start} disabled={busy} size="lg">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {phase === "classifying"
                ? "جاري تصنيف الصور…"
                : phase === "studying"
                  ? "الدراسة جارية…"
                  : phase === "analyzing"
                    ? "جاري التحليل…"
                    : "بدء التحليل"}
            </Button>
          </div>
        </section>

        {result && (
          <section className="panel p-6 text-center">
            <p className="text-xs text-muted-foreground">نتيجة لحظة الصفر</p>
            <p className={"mt-2 text-4xl font-bold sm:text-5xl " + dirColor}>{dirText}</p>
            {result.direction !== "none" && (
              <p className="mt-1 font-mono text-2xl text-primary">{result.confidence}%</p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              مدة الصفقة: {tradeDuration} دقيقة · السعر الحالي {result.currentPrice}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">{result.summary}</p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setShowDetails((v) => !v)}
            >
              <ChevronDown className={"size-4 transition-transform " + (showDetails ? "rotate-180" : "")} />
              عرض التحليل
            </Button>
          </section>
        )}

        {result && <ProjectionChart points={result.projection ?? []} direction={result.direction} />}

        {result && showDetails && <AnalysisDetails result={result} />}

        <ShotUploader
          shots={shots}
          onAdd={addShots}
          onRemove={removeShot}
          onPatch={patchShot}
          disabled={busy}
        />

        <p className="text-center text-[11px] text-muted-foreground">
          التطبيق لا يفتح أو يغلق أو يعدّل أي صفقة. القرار النهائي للمستخدم.
        </p>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Picker({
  value,
  onChange,
  options,
  render,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  render?: (v: string) => string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-input/60 px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {render ? render(opt) : opt}
        </option>
      ))}
    </select>
  );
}