export const ASSETS_DEFAULT = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "EUR/JPY",
] as const;

export const TIMEFRAMES = ["1m", "5m", "10m", "15m", "30m", "1H", "4H"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];

export const TRADE_DURATIONS = [1, 5, 10, 15] as const;
export const STUDY_DURATIONS = [15, 30, 60] as const;
export const TIME_SLOTS = ["T0", "T15", "T30", "T45"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export type Weights = {
  priceAction: number;
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

export type Settings = {
  aiProvider: AiProvider;
  geminiKey: string;
  openrouterKey: string;
  platform: string;
  assets: string[];
  timeframes: Timeframe[];
  tradeDuration: number;
  studyDuration: number;
  weights: Weights;
  minConfidence: number;
  speedCandles: number;
  autoClassify: boolean;
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
  platform: "ExpertOption",
  assets: [...ASSETS_DEFAULT],
  timeframes: ["1m", "5m", "15m"],
  tradeDuration: 5,
  studyDuration: 60,
  weights: { priceAction: 35, speed: 25, alignment: 15, indicators: 25 },
  minConfidence: 65,
  speedCandles: 10,
  autoClassify: true,
  indicators: {
    bollinger: { period: 20, deviation: 2 },
    stochastic: { k: 14, d: 3, smooth: 3 },
    rsi: { period: 14, overbought: 70, oversold: 30 },
    ma: { fast: 9, slow: 21 },
  },
};

export type ChartShot = {
  id: string;
  name: string;
  dataUrl: string;
  timeframe: Timeframe | "unknown";
  slot: TimeSlot | "unknown";
};

export type Direction = "up" | "down" | "none";

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
  scoreBreakdown: { priceAction: number; speed: number; alignment: number; indicators: number };
  /** قراءة كل معيار مستقلة عن الأوزان (0-100) مع اتجاهه، تُوزن على السيرفر بأوزان المستخدم */
  components?: {
    priceAction: ComponentReading;
    speed: ComponentReading;
    alignment: ComponentReading;
    indicators: ComponentReading;
  };
  /** الأوزان الفعلية المستخدمة في حساب الثقة (بعد التطبيع إلى 100) */
  weightsApplied?: Weights;
  confidenceUp: string[];
  confidenceDown: string[];
  projection: { t: number; price: number; label?: string }[];
  headlines: string[];
};