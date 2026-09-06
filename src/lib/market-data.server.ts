/**
 * طبقة بيانات السوق الحقيقية: مزوّد نشط واحد فقط في كل لحظة
 * بأولوية Alpha Vantage ← Polygon.io ← EODHD، مع تبديل تلقائي عند الفشل.
 * لا تُخترع أي قيمة: إن لم تتوفر بيانات صالحة حديثة يُرجع الفشل ولا تُرسل للذكاء الاصطناعي.
 */
import type { Candle } from "./indicators";
import { kinetics, readIndicators, structureFrom } from "./indicators";
import type { IndicatorParams } from "./indicators";

export const DATA_PROVIDERS = ["alphavantage", "polygon", "eodhd"] as const;
export type DataProviderId = (typeof DATA_PROVIDERS)[number];

export const PROVIDER_LABEL: Record<DataProviderId, string> = {
  alphavantage: "Alpha Vantage",
  polygon: "Polygon.io",
  eodhd: "EODHD",
};

export type ProviderKeys = Partial<Record<DataProviderId, string>>;

export type FetchOutcome =
  | { ok: true; candles: Candle[] }
  | { ok: false; reason: string };

type Interval = "1m" | "5m" | "15m" | "1h";

const STALE_LIMIT_MS: Record<Interval, number> = {
  "1m": 15 * 60_000,
  "5m": 40 * 60_000,
  "15m": 2 * 60 * 60_000,
  "1h": 6 * 60 * 60_000,
};

function symbolParts(asset: string): { base: string; quote: string; kind: "fx" | "crypto" | "metal" } {
  const upper = asset.toUpperCase().replace(/\s/g, "");
  if (upper === "GOLD" || upper === "XAUUSD" || upper === "XAU/USD")
    return { base: "XAU", quote: "USD", kind: "metal" };
  const [base, quote] = upper.includes("/") ? upper.split("/") : [upper.slice(0, 3), upper.slice(3)];
  const kind = base === "BTC" || base === "ETH" ? "crypto" : "fx";
  return { base: base ?? "EUR", quote: (quote === "USDT" ? "USD" : quote) ?? "USD", kind };
}

function validate(candles: Candle[], interval: Interval): FetchOutcome {
  const clean = candles
    .filter((c) => [c.o, c.h, c.l, c.c].every((v) => Number.isFinite(v) && v > 0) && Number.isFinite(c.t))
    .sort((a, b) => a.t - b.t);
  if (clean.length < 30) return { ok: false, reason: "عدد الشموع المتاحة غير كافٍ للتحليل" };
  const last = clean[clean.length - 1]!;
  if (Date.now() - last.t > STALE_LIMIT_MS[interval])
    return { ok: false, reason: "البيانات المستلمة قديمة (Stale) ولا تمثل السوق الحالي" };
  return { ok: true, candles: clean.slice(-200) };
}

async function jsonFetch(url: string): Promise<{ ok: true; data: unknown } | { ok: false; reason: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, reason: `استجابة غير ناجحة من المزوّد (${res.status})` };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, reason: "تعذّر الاتصال بالمزوّد أو انتهت المهلة" };
  }
}

async function fromAlphaVantage(asset: string, interval: Interval, key: string): Promise<FetchOutcome> {
  const { base, quote, kind } = symbolParts(asset);
  const av: Record<Interval, string> = { "1m": "1min", "5m": "5min", "15m": "15min", "1h": "60min" };
  const url =
    kind === "crypto"
      ? `https://www.alphavantage.co/query?function=CRYPTO_INTRADAY&symbol=${base}&market=${quote}&interval=${av[interval]}&outputsize=compact&apikey=${key}`
      : `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${base}&to_symbol=${quote}&interval=${av[interval]}&outputsize=compact&apikey=${key}`;

  const res = await jsonFetch(url);
  if (!res.ok) return res;
  const data = res.data as Record<string, unknown>;
  if (typeof data["Note"] === "string" || typeof data["Information"] === "string")
    return { ok: false, reason: "تم تجاوز حد طلبات Alpha Vantage المجاني" };
  if (typeof data["Error Message"] === "string")
    return { ok: false, reason: "رمز الأصل أو الفريم غير مدعوم في Alpha Vantage" };

  const seriesKey = Object.keys(data).find((k) => k.includes("Time Series"));
  if (!seriesKey) return { ok: false, reason: "استجابة Alpha Vantage لا تحتوي بيانات شموع" };
  const series = data[seriesKey] as Record<string, Record<string, string>>;

  const candles: Candle[] = Object.entries(series).map(([time, row]) => ({
    t: Date.parse(time.replace(" ", "T") + "Z"),
    o: Number(row["1. open"]),
    h: Number(row["2. high"]),
    l: Number(row["3. low"]),
    c: Number(row["4. close"]),
  }));
  return validate(candles, interval);
}

async function fromPolygon(asset: string, interval: Interval, key: string): Promise<FetchOutcome> {
  const { base, quote, kind } = symbolParts(asset);
  const ticker = kind === "crypto" ? `X:${base}${quote}` : `C:${base}${quote}`;
  const mult: Record<Interval, [number, string]> = {
    "1m": [1, "minute"],
    "5m": [5, "minute"],
    "15m": [15, "minute"],
    "1h": [1, "hour"],
  };
  const [n, unit] = mult[interval];
  const to = Date.now();
  const from = to - 5 * 24 * 60 * 60_000;
  const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/${n}/${unit}/${from}/${to}?adjusted=true&sort=asc&limit=300&apiKey=${key}`;

  const res = await jsonFetch(url);
  if (!res.ok) return res;
  const data = res.data as { results?: Array<Record<string, number>> };
  if (!Array.isArray(data.results) || !data.results.length)
    return { ok: false, reason: "لم يُرجع Polygon.io شموعاً للأصل المطلوب" };
  const candles: Candle[] = data.results.map((r) => ({
    t: Number(r["t"]),
    o: Number(r["o"]),
    h: Number(r["h"]),
    l: Number(r["l"]),
    c: Number(r["c"]),
  }));
  return validate(candles, interval);
}

async function fromEodhd(asset: string, interval: Interval, key: string): Promise<FetchOutcome> {
  const { base, quote, kind } = symbolParts(asset);
  const symbol = kind === "crypto" ? `${base}-${quote}.CC` : `${base}${quote}.FOREX`;
  const map: Record<Interval, string> = { "1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h" };
  const from = Math.floor((Date.now() - 5 * 24 * 60 * 60_000) / 1000);
  const url = `https://eodhd.com/api/intraday/${symbol}?interval=${map[interval]}&from=${from}&api_token=${key}&fmt=json`;

  const res = await jsonFetch(url);
  if (!res.ok) return res;
  const rows = res.data as Array<Record<string, unknown>>;
  if (!Array.isArray(rows) || !rows.length)
    return { ok: false, reason: "لم يُرجع EODHD شموعاً للأصل المطلوب" };
  const candles: Candle[] = rows.map((r) => ({
    t: Number(r["timestamp"]) * 1000,
    o: Number(r["open"]),
    h: Number(r["high"]),
    l: Number(r["low"]),
    c: Number(r["close"]),
  }));
  return validate(candles, interval);
}

const FETCHERS: Record<DataProviderId, (a: string, i: Interval, k: string) => Promise<FetchOutcome>> = {
  alphavantage: fromAlphaVantage,
  polygon: fromPolygon,
  eodhd: fromEodhd,
};

export type ProviderAttempt = { provider: DataProviderId; ok: boolean; reason?: string };

export type ActiveFeed = {
  provider: DataProviderId;
  candles: Candle[];
  attempts: ProviderAttempt[];
};

/** يجرّب المزوّدين بالترتيب ويعيد أول مزوّد سليم فقط — مزوّد نشط واحد لا أكثر. */
export async function resolveActiveFeed(
  asset: string,
  interval: Interval,
  keys: ProviderKeys,
): Promise<{ ok: true; feed: ActiveFeed } | { ok: false; attempts: ProviderAttempt[] }> {
  const attempts: ProviderAttempt[] = [];
  for (const provider of DATA_PROVIDERS) {
    const key = keys[provider]?.trim();
    if (!key) {
      attempts.push({ provider, ok: false, reason: "لا يوجد مفتاح محفوظ" });
      continue;
    }
    const out = await FETCHERS[provider](asset, interval, key);
    if (out.ok) {
      attempts.push({ provider, ok: true });
      return { ok: true, feed: { provider, candles: out.candles, attempts } };
    }
    attempts.push({ provider, ok: false, reason: out.reason });
  }
  return { ok: false, attempts };
}

export type FrameSnapshot = {
  timeframe: Interval;
  candles: number;
  lastTimestamp: string;
  currentPrice: number;
  high: number;
  low: number;
  structure: ReturnType<typeof structureFrom>;
  kinetics: ReturnType<typeof kinetics>;
  indicators: ReturnType<typeof readIndicators>;
};

export type MarketPackage = {
  asset: string;
  provider: DataProviderId;
  providerLabel: string;
  fetchedAt: string;
  currentPrice: number;
  frames: FrameSnapshot[];
  attempts: ProviderAttempt[];
};

export function snapshotFrame(
  timeframe: Interval,
  candles: Candle[],
  params: IndicatorParams,
  speedCandles: number,
): FrameSnapshot {
  const last = candles[candles.length - 1]!;
  const recent = candles.slice(-60);
  return {
    timeframe,
    candles: candles.length,
    lastTimestamp: new Date(last.t).toISOString(),
    currentPrice: last.c,
    high: Math.max(...recent.map((c) => c.h)),
    low: Math.min(...recent.map((c) => c.l)),
    structure: structureFrom(candles),
    kinetics: kinetics(candles, speedCandles),
    indicators: readIndicators(candles, params),
  };
}

export type { Interval };
