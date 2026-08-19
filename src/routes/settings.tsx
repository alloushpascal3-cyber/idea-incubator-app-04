import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TIMEFRAMES, type Timeframe } from "@/lib/scalping-types";
import { useSettings } from "@/lib/use-settings";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات محلل السكالبينغ | الأوزان والمؤشرات" },
      {
        name: "description",
        content:
          "اضبط أوزان التحليل، حدّ الثقة، الفريمات، وإعدادات المؤشرات الفنية لمحلل السكالبينغ.",
      },
      { property: "og:title", content: "إعدادات محلل السكالبينغ" },
      {
        property: "og:description",
        content: "تحكم كامل بأوزان Price Action والسرعة والمؤشرات وحد الثقة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const w = settings.weights;
  const total = w.priceAction + w.speed + w.alignment + w.indicators;

  const setWeight = (key: keyof typeof w, value: number) =>
    update({ weights: { ...w, [key]: value } });

  const toggleTimeframe = (tf: Timeframe) => {
    const has = settings.timeframes.includes(tf);
    update({
      timeframes: has
        ? settings.timeframes.filter((t) => t !== tf)
        : [...settings.timeframes, tf],
    });
  };

  return (
    <div className="min-h-screen pb-16">
      <header className="hairline sticky top-0 z-20 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <h1 className="gold-text text-lg font-bold">الإعدادات</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="size-4" />
              استعادة
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowRight className="size-4" />
                رجوع
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">أوزان التقييم — المجموع {total}%</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">عام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="platform">المنصة</Label>
              <Input
                id="platform"
                value={settings.platform}
                onChange={(e) => update({ platform: e.target.value })}
              />
            </div>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">إعدادات المؤشرات</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
          </CardContent>
        </Card>
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
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}