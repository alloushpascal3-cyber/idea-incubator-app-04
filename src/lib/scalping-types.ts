export const ASSETS_DEFAULT = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "EUR/JPY",
] as const;

/** قوائم الأزواج المهمة المعتمدة كخط أساس رسمي (§9). */
export const PAIR_GROUPS = [
  {
    label: "الأزواج الرئيسية",
    pairs: ["EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", "AUD/USD", "USD/CAD", "NZD/USD"],
  },
  {
    label: "الأزواج المتقاطعة",
    pairs: ["EUR/GBP", "EUR/JPY", "GBP/JPY", "GBP/CHF", "EUR/CHF", "AUD/JPY", "CAD/JPY"],
  },
  { label: "أسواق أخرى", pairs: ["GOLD", "BTC/USDT"] },
] as const;

export const ALL_PAIRS = PAIR_GROUPS.flatMap((g) => [...g.pairs]);

export const BROKERS = ["ExpertOption", "Pocket Option", "BingX", "TradingView"] as const;
export type Broker = (typeof BROKERS)[number];

export const TIMEFRAMES = ["1m", "5m", "10m", "15m", "30m", "1H", "4H"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

/** فريمات المؤشرات القابلة للتهيئة المستقلة (§21). */
export const INDICATOR_TFS = ["1m", "5m", "15m"] as const;
export type IndicatorTf = (typeof INDICATOR_TFS)[number];

export const TRADE_DURATIONS = [5, 10, 15, 30, 60] as const;
export const PRE_ANALYSIS_SECONDS = [30, 45, 60] as const;
export const STUDY_DURATIONS = [15, 30, 60] as const;
export const TIME_SLOTS = ["T0", "T15", "T30", "T45"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export type Weights = {
  priceAction: number;
  structure: number;
  speed: number;
  alignment: number;
  indicators: number;
};

export const AI_PROVIDERS = [
  {
    id: "gemini-3.7-flash",
    label: "Google Gemini 3.7 Flash",
    note: "يتصل عبر مفتاح Google لاستدعاء أحدث نموذج رؤية",
    key: "gemini",
  },
  {
    id: "openrouter-llama-vision",
    label: "OpenRouter — Llama 3.2 Vision",
    note: "meta-llama/llama-3.2-11b-vision-instruct:free",
    key: "openrouter",
  },
  {
    id: "openrouter-pixtral",
    label: "OpenRouter — Mistral Pixtral 12B",
    note: "mistralai/pixtral-12b:free — قراءة أرقام دقيقة",
    key: "openrouter",
  },
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number]["id"];

/** المؤشرات الأربعة الرسمية فقط: بولنجر + RSI + ستوكاستك + MACD (§20). */
export type IndicatorProfile = {
  bollinger: { period: number; deviation: number };
  rsi: { period: number; overbought: number; oversold: number };
  stochastic: { k: number; d: number; smooth: number; overbought: number; oversold: number };
  macd: { fast: number; slow: number; signal: number };
};

export const DEFAULT_INDICATOR_PROFILES: Record<IndicatorTf, IndicatorProfile> = {
  "1m": {
    bollinger: { period: 20, deviation: 2 },
    rsi: { period: 7, overbought: 70, oversold: 30 },
    stochastic: { k: 5, d: 3, smooth: 3, overbought: 80, oversold: 20 },
    macd: { fast: 12, slow: 26, signal: 9 },
  },
  "5m": {
    bollinger: { period: 20, deviation: 2 },
    rsi: { period: 14, overbought: 70, oversold: 30 },
    stochastic: { k: 14, d: 3, smooth: 3, overbought: 80, oversold: 20 },
    macd: { fast: 12, slow: 26, signal: 9 },
  },
  "15m": {
    bollinger: { period: 20, deviation: 2 },
    rsi: { period: 14, overbought: 70, oversold: 30 },
    stochastic: { k: 14, d: 3, smooth: 3, overbought: 80, oversold: 20 },
    macd: { fast: 12, slow: 26, signal: 9 },
  },
};

export type ProviderKeys = { alphavantage: string; polygon: string; eodhd: string };

export type Settings = {
  aiProvider: AiProvider;
  geminiKey: string;
  openrouterKey: string;
  providerKeys: ProviderKeys;
  broker: Broker;
  asset: string;
  assets: string[];
  timeframes: Timeframe[];
  tradeDuration: number;
  preAnalysisSeconds: number;
  studyDuration: number;
  weights: Weights;
  minConfidence: number;
  speedCandles: number;
  autoClassify: boolean;
  useDxy: boolean;
  useCorrelation: boolean;
  useNews: boolean;
  indicatorProfiles: Record<IndicatorTf, IndicatorProfile>;
  indicators: {
    bollinger: { period: number; deviation: number };
    stochastic: { k: number; d: number; smooth: number };
    rsi: { period: number; overbought: number; oversold: number };
    ma: { fast: number; slow: number };
  };
};

export const DEFAULT_SETTINGS: Settings = {
  aiProvider: "gemini-3.7-flash",
  geminiKey: "",
  openrouterKey: "",
  providerKeys: { alphavantage: "", polygon: "", eodhd: "" },
  broker: "ExpertOption",
  asset: "EUR/USD",
  assets: [...ASSETS_DEFAULT],
  timeframes: ["1m", "5m", "15m"],
  tradeDuration: 5,
  preAnalysisSeconds: 60,
  studyDuration: 60,
  weights: { priceAction: 35, structure: 15, speed: 25, alignment: 10, indicators: 15 },
  minConfidence: 65,
  speedCandles: 10,
  autoClassify: true,
  useDxy: true,
  useCorrelation: true,
  useNews: true,
  indicatorProfiles: DEFAULT_INDICATOR_PROFILES,
  indicators: {
    bollinger: { period: 20, deviation: 2 },
    stochastic: { k: 14, d: 3, smooth: 3 },
    rsi: { period: 14, overbought: 70, oversold: 30 },
    ma: { fast: 9, slow: 21 },
  },
};

/** الفريمات التحليلية الصحيحة حسب مدة الصفقة (§24 و §26). */
export function framesForDuration(duration: number): IndicatorTf[] {
  if (duration <= 10) return ["1m", "5m"];
  if (duration <= 30) return ["5m", "15m"];
  return ["15m"];
}

export type ChartShot = {
  id: string;
  name: string;
  dataUrl: string;
  timeframe: Timeframe | "unknown";
  slot: TimeSlot | "unknown";
};

export type Direction = "up" | "down" | "none";

export type ComponentReading = { bias: Direction; score: number; note?: string };

export type Zone = {
  label: string;
  rangeLow: string;
  rangeHigh: string;
  type: "support" | "resistance" | "flip";
  tests: number;
  bounces: number;
  breaks: number;
  strength: number;
  lastTest: string;
  stillValid: boolean;
};

export type DataIntegrity = {
  live: boolean;
  provider: string | null;
  fetchedAt: string | null;
  mode: "ai+live" | "local-math" | "unavailable";
  notes: string[];
};

export type AnalysisResult = {
  direction: Direction;
  confidence: number;
  summary: string;
  detectedAsset?: string;
  detectedPlatform?: string;
  currentPrice: string;
  structure: "correction" | "reversal" | "trend-continuation" | "unclear";
  structureNote: string;
  frames: { timeframe: string; trend: Direction; note: string }[];
  zones: Zone[];
  speed: {
    current: number;
    average: number;
    ratio: number;
    acceleration: number;
    accelerationState: "accelerating" | "decelerating" | "stable";
    note: string;
  };
  arrival: {
    targetLabel: string;
    distance: string;
    expectedSeconds: number;
    availableSeconds: number;
    sufficient: boolean;
  };
  indicators: { name: string; reading: string; bias: Direction }[];
  sequence: { from: string; to: string; change: string }[];
  scoreBreakdown: {
    priceAction: number;
    structure: number;
    speed: number;
    alignment: number;
    indicators: number;
  };
  /** قراءة كل معيار مستقلة عن الأوزان (0-100) مع اتجاهه، تُوزن على السيرفر بأوزان المستخدم */
  components?: {
    priceAction: ComponentReading;
    structure?: ComponentReading;
    speed: ComponentReading;
    alignment: ComponentReading;
    indicators: ComponentReading;
  };
  /** الأوزان الفعلية المستخدمة في حساب الثقة (بعد التطبيع إلى 100) */
  weightsApplied?: Weights;
  /** سياق إضافي إلزامي بحسب المواصفة */
  dxy?: { direction: Direction; supports: boolean; note: string };
  correlation?: { pair: string; relation: string; note: string }[];
  news?: { headline: string; time?: string; impact: "supports" | "opposes" | "neutral" | "risk" }[];
  noTradeReason?: string;
  data?: DataIntegrity;
  confidenceUp: string[];
  confidenceDown: string[];
  projection: { t: number; price: number; label?: string }[];
  headlines: string[];
};
