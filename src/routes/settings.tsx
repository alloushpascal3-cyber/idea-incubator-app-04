import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, RotateCcw, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { GeminiKeysPanel } from "@/components/scalping/GeminiKeysPanel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  AI_PROVIDERS,
  DEFAULT_SETTINGS,
  TIMEFRAMES,
  type AiProvider,
  type Timeframe,
} from "@/lib/scalping-types";
import { useSettings } from "@/lib/use-settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات محلل السكالبينغ | الأوزان والمؤشرات والمفاتيح" },
      {
        name: "description",
        content:
          "اضبط أوزان التحليل، حدّ الثقة، الفريمات، إعدادات المؤشرات، وإدارة مفاتيح Gemini بأمان على السيرفر.",
      },
      { property: "og:title", content: "إعدادات محلل السكالبينغ" },
      {
        property: "og:description",
        content: "تحكم كامل بأوزان Price Action والسرعة والمؤشرات وحد الثقة ومفاتيح الذكاء الاصطناعي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SectionActions({
  onSave,
  onReset,
  resetLabel,
}: {
  onSave: () => void;
  onReset: () => void;
  resetLabel: string;
}) {
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleSave = () => {
    onSave();
    setDone(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDone(false), 2000);
  };

  return (
    <div className="hairline mt-5 flex flex-wrap items-center justify-end gap-2 pt-3">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <RotateCcw className="size-4" />
            استعادة الافتراضي
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent dir="rtl" className="panel">
          <AlertDialogHeader>
            <AlertDialogTitle>استعادة الإعدادات الافتراضية</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              سيتم إرجاع «{resetLabel}» إلى القيم الافتراضية فقط، دون المساس ببقية الإعدادات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReset();
                toast.success(`تمت استعادة الافتراضي — ${resetLabel}`);
              }}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button
        size="sm"
        onClick={handleSave}
        className={
          done
            ? "border border-bull bg-bull/20 text-bull hover:bg-bull/25"
            : ""
        }
      >
        {done ? <Check className="size-4" /> : <Save className="size-4" />}
        {done ? "تم الحفظ" : "حفظ"}
      </Button>
    </div>
  );
}

function SettingsPage() {
  const { settings, update } = useSettings();
  const w = settings.weights;
  const total = w.priceAction + w.speed + w.alignment + w.indicators;

  const saved = (label: string) => toast.success(`تم حفظ ${label}`);

  const setWeight = (key: keyof typeof w, value: number) =>
    update({ weights: { ...w, [key]: value } });

  const toggleTimeframe = (tf: Timeframe) => {
    const has = settings.timeframes.includes(tf);
    update({
      timeframes: has ? settings.timeframes.filter((t) => t !== tf) : [...settings.timeframes, tf],
    });
  };

  return (
    <div className="min-h-screen pb-16">
      <header className="hairline sticky top-0 z-20 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="tri-shine text-lg font-bold">الإعدادات</h1>
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowRight className="size-4" />
              رجوع
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Accordion type="multiple" className="space-y-3" defaultValue={["keys"]}>
          <AccordionItem
            value="keys"
            className="panel neon-frame overflow-hidden border-none px-4"
          >
            <AccordionTrigger className="tri-shine text-base font-bold">
              مفاتيح Gemini (4 خانات)
            </AccordionTrigger>
            <AccordionContent>
              <GeminiKeysPanel />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="provider"
            className="panel neon-frame overflow-hidden border-none px-4"
          >
            <AccordionTrigger className="tri-shine text-base font-bold">
              النموذج النشط ومفاتيح المتصفح
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="geminiKey">Google Gemini API Key (اختياري — يُحفظ محلياً)</Label>
                  <Input
                    id="geminiKey"
                    type="password"
                    dir="ltr"
                    placeholder="AIza..."
                    autoComplete="off"
                    value={settings.geminiKey}
                    onChange={(e) => update({ geminiKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openrouterKey">OpenRouter API Key</Label>
                  <Input
                    id="openrouterKey"
                    type="password"
                    dir="ltr"
                    placeholder="sk-or-v1-..."
                    autoComplete="off"
                    value={settings.openrouterKey}
                    onChange={(e) => update({ openrouterKey: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>النموذج النشط</Label>
                  <RadioGroup
                    value={settings.aiProvider}
                    onValueChange={(v) => update({ aiProvider: v as AiProvider })}
                    className="gap-2"
                  >
                    {AI_PROVIDERS.map((p) => (
                      <label
                        key={p.id}
                        htmlFor={p.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3"
                      >
                        <RadioGroupItem id={p.id} value={p.id} className="mt-0.5" />
                        <span className="space-y-1">
                          <span className="block text-sm font-medium">{p.label}</span>
                          <span
                            className="block font-mono text-[11px] text-muted-foreground"
                            dir="ltr"
                          >
                            {p.note}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                  <p className="text-[11px] text-muted-foreground">
                    إن تُركت خانة Gemini فارغة، يستخدم التطبيق المفاتيح المخزّنة على السيرفر
                    بالتبديل التلقائي عند استنفاد الحصة.
                  </p>
                </div>
              </div>
              <SectionActions
                resetLabel="النموذج والمفاتيح المحلية"
                onSave={() => saved("النموذج والمفاتيح")}
                onReset={() =>
                  update({
                    aiProvider: DEFAULT_SETTINGS.aiProvider,
                    geminiKey: DEFAULT_SETTINGS.geminiKey,
                    openrouterKey: DEFAULT_SETTINGS.openrouterKey,
                  })
                }
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="weights"
            className="panel neon-frame overflow-hidden border-none px-4"
          >
            <AccordionTrigger className="tri-shine text-base font-bold">
              أوزان التقييم — المجموع {total}%
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-5">
                {(
                  [
                    ["priceAction", "سلوك السعر"],
                    ["speed", "السرعة والتسارع"],
                    ["alignment", "توافق الفريمات"],
                    ["indicators", "المؤشرات الفنية"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{label}</span>
                      <span className="text-muted-foreground">{w[key]}%</span>
                    </div>
                    <Slider
                      value={[w[key]]}
                      min={0}
                      max={60}
                      step={5}
                      onValueChange={(v) => setWeight(key, v[0] ?? 0)}
                    />
                  </div>
                ))}
                {total !== 100 ? (
                  <p className="text-xs text-destructive">
                    يُفضّل أن يكون المجموع 100% لضبط درجة الثقة بدقة.
                  </p>
                ) : null}
              </div>
              <SectionActions
                resetLabel="أوزان التقييم"
                onSave={() => saved("أوزان التقييم")}
                onReset={() => update({ weights: { ...DEFAULT_SETTINGS.weights } })}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="general"
            className="panel neon-frame overflow-hidden border-none px-4"
          >
            <AccordionTrigger className="tri-shine text-base font-bold">
              الإعدادات العامة
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-5">
                <p className="rounded-lg border border-border bg-input/30 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                  المنصة والزوج غير مثبّتين — يقرأهما التطبيق تلقائياً من صور الشارت أثناء التحليل.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>الحد الأدنى للثقة</span>
                    <span className="text-muted-foreground">{settings.minConfidence}%</span>
                  </div>
                  <Slider
                    value={[settings.minConfidence]}
                    min={50}
                    max={95}
                    step={1}
                    onValueChange={(v) => update({ minConfidence: v[0] ?? 65 })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>عدد الشمعات لقياس السرعة</span>
                    <span className="text-muted-foreground">{settings.speedCandles}</span>
                  </div>
                  <Slider
                    value={[settings.speedCandles]}
                    min={3}
                    max={30}
                    step={1}
                    onValueChange={(v) => update({ speedCandles: v[0] ?? 10 })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoClassify">تصنيف الصور تلقائياً</Label>
                  <Switch
                    id="autoClassify"
                    checked={settings.autoClassify}
                    onCheckedChange={(checked) => update({ autoClassify: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>الفريمات المستخدمة</Label>
                  <div className="flex flex-wrap gap-2">
                    {TIMEFRAMES.map((tf) => {
                      const active = settings.timeframes.includes(tf);
                      return (
                        <Button
                          key={tf}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() => toggleTimeframe(tf)}
                        >
                          {tf}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <SectionActions
                resetLabel="الإعدادات العامة"
                onSave={() => saved("الإعدادات العامة")}
                onReset={() =>
                  update({
                    minConfidence: DEFAULT_SETTINGS.minConfidence,
                    speedCandles: DEFAULT_SETTINGS.speedCandles,
                    autoClassify: DEFAULT_SETTINGS.autoClassify,
                    timeframes: [...DEFAULT_SETTINGS.timeframes],
                  })
                }
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="indicators"
            className="panel neon-frame overflow-hidden border-none px-4"
          >
            <AccordionTrigger className="tri-shine text-base font-bold">
              إعدادات المؤشرات
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label="Bollinger — الفترة"
                  value={settings.indicators.bollinger.period}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        bollinger: { ...settings.indicators.bollinger, period: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="Bollinger — الانحراف"
                  value={settings.indicators.bollinger.deviation}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        bollinger: { ...settings.indicators.bollinger, deviation: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="RSI — الفترة"
                  value={settings.indicators.rsi.period}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        rsi: { ...settings.indicators.rsi, period: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="RSI — تشبع شرائي"
                  value={settings.indicators.rsi.overbought}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        rsi: { ...settings.indicators.rsi, overbought: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="RSI — تشبع بيعي"
                  value={settings.indicators.rsi.oversold}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        rsi: { ...settings.indicators.rsi, oversold: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="Stochastic — K"
                  value={settings.indicators.stochastic.k}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        stochastic: { ...settings.indicators.stochastic, k: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="Stochastic — D"
                  value={settings.indicators.stochastic.d}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        stochastic: { ...settings.indicators.stochastic, d: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="Stochastic — Smooth"
                  value={settings.indicators.stochastic.smooth}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        stochastic: { ...settings.indicators.stochastic, smooth: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="MA — سريع"
                  value={settings.indicators.ma.fast}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        ma: { ...settings.indicators.ma, fast: n },
                      },
                    })
                  }
                />
                <NumberField
                  label="MA — بطيء"
                  value={settings.indicators.ma.slow}
                  onChange={(n) =>
                    update({
                      indicators: {
                        ...settings.indicators,
                        ma: { ...settings.indicators.ma, slow: n },
                      },
                    })
                  }
                />
              </div>
              <SectionActions
                resetLabel="إعدادات المؤشرات"
                onSave={() => saved("إعدادات المؤشرات")}
                onReset={() =>
                  update({
                    indicators: {
                      bollinger: { ...DEFAULT_SETTINGS.indicators.bollinger },
                      stochastic: { ...DEFAULT_SETTINGS.indicators.stochastic },
                      rsi: { ...DEFAULT_SETTINGS.indicators.rsi },
                      ma: { ...DEFAULT_SETTINGS.indicators.ma },
                    },
                  })
                }
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
