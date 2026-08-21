import type { AnalysisResult, Settings, TimeSlot, Timeframe } from "./scalping-types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type GatewayMessage = {
  role: "system" | "user";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
};

async function callGateway(model: string, messages: GatewayMessage[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI غير مهيأ");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) throw new Error("تم تجاوز حد الطلبات، حاول بعد قليل");
    if (res.status === 402) throw new Error("رصيد الذكاء الاصطناعي غير كافٍ");
    throw new Error(`فشل التحليل (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content ?? "";
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("تعذّر قراءة نتيجة التحليل");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export type ClassifyInput = { images: { id: string; dataUrl: string }[] };
export type ClassifyOutput = {
  results: { id: string; timeframe: Timeframe | "unknown"; slot: TimeSlot | "unknown" }[];
};

export async function classifyShots(input: ClassifyInput): Promise<ClassifyOutput> {
  const content: GatewayMessage["content"] = [
    {
      type: "text",
      text: `صنّف كل صورة شارت: حدّد الفريم الزمني (أحد: 1m,5m,10m,15m,30m,1H,4H) و ترتيبها الزمني ضمن مجموعتها (T0 للأقدم ثم T15 ثم T30 ثم T45 حسب التتابع الظاهر في حركة السعر ووقت الشارت).
الصور مرقّمة بالترتيب الذي رفعه المستخدم. إذا لم تستطع التحديد بثقة استخدم "unknown".
أعد JSON فقط بالشكل: {"results":[{"id":"...","timeframe":"5m","slot":"T0"}]}
المعرفات بالترتيب: ${input.images.map((i) => i.id).join(", ")}`,
    },
    ...input.images.map((img) => ({ type: "image_url", image_url: { url: img.dataUrl } })),
  ];

  const raw = await callGateway("google/gemini-2.5-flash", [
    { role: "system", content: "أنت محلل شارت خبير. أعد JSON صالحًا فقط بدون أي شرح." },
    { role: "user", content },
  ]);
  return parseJson<ClassifyOutput>(raw);
}

export type AnalyzeInput = {
  asset: string;
  settings: Settings;
  images: { id: string; timeframe: string; slot: string; dataUrl: string }[];
};

const SCHEMA = `{
  "direction": "up|down|none",
  "confidence": 0-100,
  "summary": "سطر واحد",
  "currentPrice": "نص",
  "structure": "correction|reversal|trend-continuation|unclear",
  "structureNote": "نص",
  "frames": [{"timeframe":"5m","trend":"up|down|none","note":"نص"}],
  "zones": [{"label":"نص","rangeLow":"نص","rangeHigh":"نص","type":"support|resistance|flip","tests":0,"bounces":0,"breaks":0,"strength":0,"lastTest":"نص","stillValid":true}],
  "speed": {"current":0,"average":0,"ratio":0,"acceleration":0,"accelerationState":"accelerating|decelerating|stable","note":"نص"},
  "arrival": {"targetLabel":"نص","distance":"نص","expectedSeconds":0,"availableSeconds":0,"sufficient":true},
  "indicators": [{"name":"RSI","reading":"نص","bias":"up|down|none"}],
  "sequence": [{"from":"T0","to":"T15","change":"نص"}],
  "scoreBreakdown": {"priceAction":0,"speed":0,"alignment":0,"indicators":0},
  "confidenceUp": ["نص"],
  "confidenceDown": ["نص"],
  "projection": [{"t":0,"price":0,"label":"اختياري"}],
  "headlines": ["نص"]
}`;

export async function analyzeSequence(input: AnalyzeInput): Promise<AnalysisResult> {
  const { asset, settings } = input;
  const w = settings.weights;

  const prompt = `أنت نظام تحليل سكالبينغ تحليلي بحت (لا تنفيذ صفقات، لا شراء ولا بيع).
الأصل: ${asset} | المنصة: ${settings.platform}
مدة الصفقة: ${settings.tradeDuration} دقيقة | مدة الدراسة: ${settings.studyDuration} ثانية
الفريمات المطلوبة: ${settings.timeframes.join(", ")}
عدد الشموع لحساب السرعة: ${settings.speedCandles}
إعدادات المؤشرات: بولنجر ${settings.indicators.bollinger.period}/${settings.indicators.bollinger.deviation}, ستوكاستك ${settings.indicators.stochastic.k}/${settings.indicators.stochastic.d}/${settings.indicators.stochastic.smooth}, RSI ${settings.indicators.rsi.period} (${settings.indicators.rsi.oversold}/${settings.indicators.rsi.overbought}), متوسطات ${settings.indicators.ma.fast}/${settings.indicators.ma.slow}

منهجية إلزامية:
1) سلوك السعر أولًا: الاتجاه، HH/HL/LH/LL، الاختراق والاختراق الكاذب، شموع القوة وشموع الرفض.
2) مناطق الدعم والمقاومة كنطاقات لا خطوط: سجّل عدد الاختبارات والارتدادات والاختراقات وقوة المنطقة (0-100) وهل تغيّر دورها.
3) السرعة: V=|P2-P1|/(t2-t1)، ثم المتوسط Vavg، ثم النسبة الحالية/المتوسط، ثم التسارع A=(V2-V1)/(t2-t1).
4) الزمن المتوقع للوصول: T=D/V بسرعة فعّالة (الحالية + الحديثة + المتوسط)، وقارنه بالزمن المتاح (${settings.tradeDuration * 60} ثانية). إن كان أطول فالسرعة غير كافية وتُخفَض الثقة.
5) قارن الصور المتتابعة T0→T15→T30→T45 وارصد تغيّر الاتجاه والسرعة والتسارع وظهور المناطق والشموع.
6) الفريمات الأعلى للسياق، والأقرب لمدة الصفقة لتوقيت الدخول (وزن أعلى للأقرب).
7) المؤشرات للتأكيد فقط وبحد أقصى ${w.indicators}% ولا تتجاوز 25%. عند تعارض المؤشر مع السعر: الأولوية للسعر.
8) أوزان الثقة: سلوك السعر والمناطق ${w.priceAction}%، السرعة والتسارع والزمن ${w.speed}%، توافق الفريمات ${w.alignment}%، المؤشرات ${w.indicators}%. أعد كل جزء في scoreBreakdown كنقاط من وزنه.
9) إذا كانت المعطيات متناقضة أو الثقة أقل من ${settings.minConfidence}% فاختر direction = "none" (لا أفضلية).
10) projection: 12-16 نقطة تمثل مسار السعر المتوقع خلال مدة الصفقة بناءً على السرعة والتسارع وزمن الوصول للمناطق (t = ثوانٍ من الصفر، price = مستوى سعري رقمي واقعي)، مع label على النقاط المهمة مثل "مقاومة" أو "ارتداد متوقع". هذا توقع وليس سعرًا حقيقيًا.
11) headlines: 5-7 عناوين عربية قصيرة تصلح لشريط إخباري متحرك تلخّص الاتجاه والثقة والمناطق والسرعة.

الصور مع تصنيفها:
${input.images.map((i, idx) => `${idx + 1}) الفريم ${i.timeframe} — الزمن ${i.slot}`).join("\n")}

أعد JSON صالحًا فقط بهذا الشكل:
${SCHEMA}`;

  const content: GatewayMessage["content"] = [
    { type: "text", text: prompt },
    ...input.images.map((img) => ({ type: "image_url", image_url: { url: img.dataUrl } })),
  ];

  const messages: GatewayMessage[] = [
    {
      role: "system",
      content:
        "أنت محلل سكالبينغ محترف يقرأ صور الشارت. أداة تحليل فقط ولا تنفّذ صفقات. أعد JSON صالحًا فقط بدون أي نص إضافي.",
    },
    { role: "user", content },
  ];

  let raw = "";
  try {
    raw = await callGateway("google/gemini-2.5-pro", messages);
  } catch (error) {
    // fallback to the faster model when the primary one fails (rate limit / timeout)
    if (error instanceof Error && /رصيد/.test(error.message)) throw error;
    raw = await callGateway("google/gemini-2.5-flash", messages);
  }

  const result = parseJson<AnalysisResult>(raw);
  if (result.confidence < settings.minConfidence) result.direction = "none";
  return result;
}
