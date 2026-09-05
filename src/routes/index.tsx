import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, KeyRound, Loader2, Play, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AnalysisDetails } from "@/components/scalping/AnalysisDetails";
import { NewsTicker, type TickerItem } from "@/components/scalping/NewsTicker";
import { OrbitEmblem } from "@/components/scalping/OrbitEmblem";
import { ProjectionChart } from "@/components/scalping/ProjectionChart";
import { ProjectionTable } from "@/components/scalping/ProjectionTable";
import { ShotUploader } from "@/components/scalping/ShotUploader";
import { TradeSetupDialog } from "@/components/scalping/TradeSetupDialog";
import { Button } from "@/components/ui/button";
import { friendlyText } from "@/lib/ai-errors";
import { analyzeChartSequence, classifyChartShots } from "@/lib/scalping.functions";
import {
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

type Phase = "idle" | "processing" | "waiting" | "live";

const PROCESS_MS = 60_000;
const SESSION_KEY = "scalping-session-v1";

type Persisted = {
  phase: Phase;
  processEnd: number | null;
  revealAt: number | null;
  result: AnalysisResult | null;
  asset: string;
  tradeDuration: number;
  shots: ChartShot[];
};

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

function clock(total: number) {
  const m = Math.floor(Math.max(total, 0) / 60);
  const s = Math.max(total, 0) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Home() {
  const { settings, loaded } = useSettings();
  const classify = useServerFn(classifyChartShots);
  const analyze = useServerFn(analyzeChartSequence);

  const [asset, setAsset] = useState("EUR/USD");
  const [tradeDuration, setTradeDuration] = useState(5);
  const [shots, setShots] = useState<ChartShot[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [processEnd, setProcessEnd] = useState<number | null>(null);
  const [revealAt, setRevealAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const shotsRef = useRef<ChartShot[]>([]);
  const pendingRef = useRef<AnalysisResult | null>(null);
  const restoredRef = useRef(false);
  const runRef = useRef(0);

  useEffect(() => {
    shotsRef.current = shots;
  }, [shots]);

  useEffect(() => {
    if (!loaded || restoredRef.current) return;
    setAsset(settings.assets[0] ?? "EUR/USD");
    setTradeDuration(settings.tradeDuration);
  }, [loaded, settings.assets, settings.tradeDuration]);

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

  const runPipeline = useCallback(
    async (runId: number, source?: ChartShot[]) => {
      let list = source ?? shotsRef.current;
      if (list.length < 2) {
        setPhase("idle");
        setProcessEnd(null);
        toast.error("ارفع صورتين على الأقل قبل بدء التهيئة");
        return;
      }

      if (settings.autoClassify && list.some((s) => s.timeframe === "unknown" || s.slot === "unknown")) {
        try {
          const { results } = await classify({
            data: {
              images: list.map((s) => ({ id: s.id, dataUrl: s.dataUrl })),
              ai: {
                provider: settings.aiProvider,
                geminiKey: settings.geminiKey,
                openrouterKey: settings.openrouterKey,
              },
            },
          });
          list = list.map((s) => {
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
        } catch {
          toast.warning("تعذّر التصنيف التلقائي، سيتم استخدام التصنيف الحالي");
        }
        if (runRef.current !== runId) return;
      }

      try {
        const data = await analyze({
          data: {
            asset,
            settings: { ...settings, tradeDuration, studyDuration: 60 },
            ai: {
              provider: settings.aiProvider,
              geminiKey: settings.geminiKey,
              openrouterKey: settings.openrouterKey,
            },
            images: list.map((s) => ({
              id: s.id,
              timeframe: s.timeframe,
              slot: s.slot,
              dataUrl: s.dataUrl,
            })),
          },
        });
        if (runRef.current !== runId) return;
        pendingRef.current = data;
        setError(null);
      } catch (err) {
        if (runRef.current !== runId) return;
        const message = friendlyText(err);
        setPhase("idle");
        setProcessEnd(null);
        setError(message);
        toast.error(message);
      }

    },
    [analyze, asset, classify, settings, tradeDuration],
  );

  // restore a running session (survives refresh / closing the tab)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Persisted>;
        restoredRef.current = true;
        if (saved.asset) setAsset(saved.asset);
        if (saved.tradeDuration) setTradeDuration(saved.tradeDuration);
        if (saved.shots?.length) {
          setShots(saved.shots);
          shotsRef.current = saved.shots;
        }
        if (saved.result) {
          pendingRef.current = saved.result;
          setResult(saved.result);
          setRevealAt(saved.revealAt ?? saved.processEnd ?? Date.now());
          setProcessEnd(saved.processEnd ?? null);
          setPhase("live");
        } else if (saved.phase === "processing" || saved.phase === "waiting") {
          setProcessEnd(saved.processEnd ?? Date.now() + PROCESS_MS);
          setPhase("processing");
          runRef.current += 1;
          void runPipeline(runRef.current, saved.shots ?? []);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist every meaningful change until the session is ended
  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: Persisted = {
        phase,
        processEnd,
        revealAt,
        result,
        asset,
        tradeDuration,
        shots,
      };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    } catch {
      /* storage full or unavailable */
    }
  }, [hydrated, phase, processEnd, revealAt, result, asset, tradeDuration, shots]);

  // single wall-clock ticker (keeps counters exact after a refresh)
  useEffect(() => {
    if (phase === "idle") return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [phase]);

  const remaining =
    phase === "processing" || phase === "waiting"
      ? Math.max(0, Math.ceil(((processEnd ?? now) - now) / 1000))
      : 0;
  const sessionLimit = tradeDuration * 60;
  const elapsed =
    phase === "live" && revealAt ? Math.min(sessionLimit, Math.floor((now - revealAt) / 1000)) : 0;
  const sessionOver = phase === "live" && !!revealAt && elapsed >= sessionLimit;

  // the strike moment: reveal exactly at 00:00 (or as soon as the model answers)
  useEffect(() => {
    if (phase !== "processing" && phase !== "waiting") return;
    if (remaining > 0) return;
    if (pendingRef.current) {
      setResult(pendingRef.current);
      setRevealAt(processEnd ?? Date.now());
      setPhase("live");
    } else if (phase !== "waiting") {
      setPhase("waiting");
    }
  }, [phase, remaining, processEnd, now]);

  const start = useCallback(() => {
    if (shotsRef.current.length < 2) {
      toast.error("ارفع صورتين على الأقل قبل بدء التهيئة");
      return;
    }
    runRef.current += 1;
    const runId = runRef.current;
    pendingRef.current = null;
    setResult(null);
    setError(null);
    setShowDetails(false);

    setRevealAt(null);
    setNow(Date.now());
    setProcessEnd(Date.now() + PROCESS_MS);
    setPhase("processing");
    void runPipeline(runId);
  }, [runPipeline]);

  const endSession = useCallback(() => {
    runRef.current += 1;
    pendingRef.current = null;
    setPhase("idle");
    setProcessEnd(null);
    setRevealAt(null);
    setResult(null);
    setError(null);
    setShowDetails(false);

    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const busy = phase === "processing" || phase === "waiting";
  const dirText =
    result?.direction === "up" ? "صعود" : result?.direction === "down" ? "هبوط" : "لا أفضلية";
  const dirColor =
    result?.direction === "up" ? "text-bull" : result?.direction === "down" ? "text-bear" : "text-neutral";

  const AUTO = "يُحدد تلقائياً";
  const detected = (v?: string) => (v && v !== "unknown" ? v : "");
  const assetText = detected(result?.detectedAsset) || (result ? asset : AUTO);
  const platformText = detected(result?.detectedPlatform) || AUTO;

  const ticker = useMemo<TickerItem[]>(() => {
    const items: TickerItem[] = [
      { text: `المنصة ${platformText}`, tone: "gold" },
      { text: `مدة الصفقة ${tradeDuration} دقيقة`, tone: "info" },
      {
        text:
          phase === "processing" || phase === "waiting"
            ? `نافذة التهيئة والتفكير ${clock(remaining)}`
            : phase === "live"
              ? `زمن الجلسة ${clock(elapsed)} / ${clock(sessionLimit)}`
              : "جاهز — ارفع الصور ثم ابدأ التهيئة",
        tone: phase === "live" ? "bull" : "gold",
      },
      { text: `الصور: ${shots.length} · ${imagesStatus}`, tone: "info" },
    ];
    if (result) {
      items.push(
        { text: `الأصل ${assetText}`, tone: "gold" },
        { text: `السعر ${result.currentPrice}`, tone: "info" },
        {
          text: `التوصية ${dirText} ${result.direction === "none" ? "" : `${result.confidence}%`}`,
          tone: result.direction === "up" ? "bull" : result.direction === "down" ? "bear" : "gold",
        },
        { text: `السرعة ×${result.speed.ratio}`, tone: "info" },
        {
          text: `التسارع ${
            result.speed.accelerationState === "accelerating"
              ? "متزايد"
              : result.speed.accelerationState === "decelerating"
                ? "متباطئ"
                : "مستقر"
          }`,
          tone: result.speed.accelerationState === "accelerating" ? "bull" : "bear",
        },
        {
          text: `الزمن للهدف ${result.arrival.expectedSeconds}ث / متاح ${result.arrival.availableSeconds}ث`,
          tone: result.arrival.sufficient ? "bull" : "bear",
        },
        ...result.headlines.map((h): TickerItem => ({ text: h, tone: "gold" })),
      );
    }
    return items;
  }, [
    platformText,
    assetText,
    tradeDuration,
    phase,
    remaining,
    elapsed,
    sessionLimit,
    shots.length,
    imagesStatus,
    result,
    dirText,
  ]);

  return (
    <div className="min-h-screen pb-16">
      <header className="hairline sticky top-0 z-20 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center">
          <h1 className="swiss-shine text-3xl font-bold tracking-[0.3em] sm:text-4xl">PASCAL</h1>
          <p className="mt-1 text-[11px] tracking-[0.35em] text-muted-foreground">تداول أسواق</p>
        </div>
      </header>

      <NewsTicker items={ticker} />

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-4">
        {/* صفحة الجلسة: الزوج والثقة ثم الرسم البياني ثم الجدول */}
        {result && (
          <>
            <section className="tv-screen neon-frame p-3 sm:p-4">
              <div className="animate-scan pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-primary/10 to-transparent" />
              <div className="relative">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] tracking-widest text-muted-foreground">الأصل المقروء</p>
                    <p className="gold-text truncate text-xl font-bold sm:text-2xl">{assetText}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] tracking-widest text-muted-foreground">التوصية</p>
                    <p className={"text-xl font-bold sm:text-2xl " + dirColor}>{dirText}</p>
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>نسبة الثقة</span>
                    <span className="font-mono text-sm text-primary">{result.confidence}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-bull transition-all"
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                  <Stat label="السعر الحالي" value={result.currentPrice} tone="text-foreground" />
                  <Stat label="نسبة السرعة" value={`×${result.speed.ratio}`} tone="text-chart-4" />
                  <Stat
                    label="الهيكل"
                    value={
                      result.structure === "reversal"
                        ? "انعكاس"
                        : result.structure === "correction"
                          ? "تصحيح"
                          : result.structure === "trend-continuation"
                            ? "استمرار"
                            : "غير واضح"
                    }
                    tone="text-primary"
                  />
                  <Stat
                    label="كفاية الزمن"
                    value={result.arrival.sufficient ? "كافٍ" : "غير كافٍ"}
                    tone={result.arrival.sufficient ? "text-bull" : "text-bear"}
                  />
                </div>

                <p className="mt-2.5 text-xs text-muted-foreground">{result.summary}</p>

                {/* الرسم البياني ثم جدول المعلومات في الأعلى */}
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <ProjectionChart points={result.projection ?? []} direction={result.direction} />
                  <ProjectionTable
                    points={result.projection ?? []}
                    direction={result.direction}
                    asset={assetText}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowDetails((v) => !v)}>
                    <ChevronDown
                      className={"size-4 transition-transform " + (showDetails ? "rotate-180" : "")}
                    />
                    عرض التحليل الكامل
                  </Button>
                  <span className="font-mono text-xs text-bull">
                    {sessionOver ? "انتهى زمن الجلسة" : `زمن الجلسة ${clock(elapsed)}`}
                  </span>
                </div>
              </div>
            </section>

            {showDetails && <AnalysisDetails result={result} />}

            {/* زر إنهاء الجلسة فقط — يعود بالمستخدم للصفحة الأساسية */}
            <div className="flex justify-center">
              <Button variant="secondary" size="lg" onClick={endSession} className="gold-ring">
                <Square className="size-4" />
                إنهاء الجلسة
              </Button>
            </div>
          </>
        )}

        {/* الصفحة الأساسية: العداد والأزرار ثم جدول رفع الصور */}
        {!result && (
          <>
            <section
              className={"panel neon-frame gold-ring " + (busy ? "p-3 sm:p-4" : "p-4 sm:p-5")}
            >
              <div className="flex flex-col items-center gap-3 sm:flex-row-reverse sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block">
                    <OrbitEmblem active={busy} />
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-[10px] tracking-widest text-muted-foreground">
                      {phase === "processing"
                        ? "نافذة التهيئة والتفكير"
                        : phase === "waiting"
                          ? "اللحظة الأخيرة"
                          : error
                            ? "تعذّر إصدار الإشارة"
                            : "عداد التطبيق"}
                    </p>
                    <p
                      className={
                        "font-mono text-3xl leading-none sm:text-4xl " +
                        (busy ? "text-primary" : "text-muted-foreground")
                      }
                    >
                      {clock(busy ? remaining : PROCESS_MS / 1000)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <TradeSetupDialog
                    platform={platformText}
                    tradeDuration={tradeDuration}
                    onTradeDuration={setTradeDuration}
                    disabled={busy}
                  />
                  <Button onClick={start} size="lg" disabled={busy}>
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Play className="size-4" />
                    )}
                    {busy ? "جاري التحليل…" : "التحليل وبدء الصفقة"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={refreshKey}
                    disabled={keyBusy || busy}
                    className={
                      keyBusy
                        ? "animate-pulse border border-primary bg-primary/25 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.6)]"
                        : ""
                    }
                  >
                    <KeyRound className={"size-4 " + (keyBusy ? "animate-spin" : "")} />
                    {keyBusy ? "جاري البحث عن مفتاح متاح…" : "تحديث مفتاح API"}
                  </Button>
                </div>
              </div>

              <p className="mt-2.5 text-center text-[11px] text-muted-foreground sm:text-right">
                {phase === "processing"
                  ? "معالجة الصور وحساب السرعة والتسارع وبناء التوقع"
                  : phase === "waiting"
                    ? "النموذج ما زال يقرأ الصور، ستظهر الإشارة لحظة جهوزها"
                    : error
                      ? "راجع الرسالة أدناه ثم أعد المحاولة"
                      : "حدّث المفتاح، هيّئ الصفقة، ارفع الصور، ثم اضغط التحليل وبدء الصفقة"}
              </p>
            </section>

            {error && (
              <section className="panel border-bear/50 p-3 text-center">
                <p className="text-[11px] tracking-widest text-muted-foreground">حالة التحليل</p>
                <p className="mt-1 text-sm text-bear">{error}</p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  لم يتم إصدار أي إشارة، ولم تُفتح الجلسة. الصور محفوظة كما هي — اضغط «التحليل وبدء
                  الصفقة» لإعادة المحاولة.
                </p>
              </section>
            )}

            <ShotUploader
              shots={shots}
              onAdd={addShots}
              onRemove={removeShot}
              onPatch={patchShot}
              disabled={busy}
            />
          </>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          التطبيق لا يفتح أو يغلق أو يعدّل أي صفقة. القرار النهائي للمستخدم.
        </p>

      </main>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="neon-frame rounded-xl bg-card/50 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={"font-mono text-sm " + tone}>{value}</p>
    </div>
  );
}
