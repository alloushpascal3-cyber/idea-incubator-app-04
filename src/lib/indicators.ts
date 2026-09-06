/**
 * حسابات رياضية محلية بحتة على شموع حقيقية (OHLC) — لا تخمين ولا قيم مفترضة.
 * تُستخدم في الوضع الرياضي المحلي وفي تغذية الذكاء الاصطناعي ببيانات مؤكدة.
 */

export type Candle = { t: number; o: number; h: number; l: number; c: number };

export type IndicatorParams = {
  bollinger: { period: number; deviation: number };
  rsi: { period: number; overbought: number; oversold: number };
  stochastic: { k: number; d: number; smooth: number; overbought: number; oversold: number };
  macd: { fast: number; slow: number; signal: number };
};

export type IndicatorReadings = {
  bollinger: { upper: number; middle: number; lower: number; percentB: number } | null;
  rsi: number | null;
  stochastic: { k: number; d: number } | null;
  macd: { macd: number; signal: number; histogram: number } | null;
};

export type Kinetics = {
  velocity: number;
  averageVelocity: number;
  ratio: number;
  acceleration: number;
  accelerationState: "accelerating" | "decelerating" | "stable";
};

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function emaSeries(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i]! * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function bollinger(closes: number[], period: number, deviation: number) {
  const middle = sma(closes, period);
  if (middle == null) return null;
  const slice = closes.slice(-period);
  const variance = slice.reduce((sum, v) => sum + (v - middle) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  const upper = middle + deviation * sd;
  const lower = middle - deviation * sd;
  const last = closes[closes.length - 1]!;
  const width = upper - lower;
  return {
    upper,
    middle,
    lower,
    percentB: width === 0 ? 50 : ((last - lower) / width) * 100,
  };
}

export function rsi(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function stochastic(candles: Candle[], kPeriod: number, dPeriod: number, smooth: number) {
  if (candles.length < kPeriod + smooth + dPeriod) return null;
  const rawK: number[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const window = candles.slice(i - kPeriod + 1, i + 1);
    const high = Math.max(...window.map((c) => c.h));
    const low = Math.min(...window.map((c) => c.l));
    const close = candles[i]!.c;
    rawK.push(high === low ? 50 : ((close - low) / (high - low)) * 100);
  }
  const smoothedK: number[] = [];
  for (let i = smooth - 1; i < rawK.length; i++) {
    smoothedK.push(rawK.slice(i - smooth + 1, i + 1).reduce((a, b) => a + b, 0) / smooth);
  }
  const k = smoothedK[smoothedK.length - 1];
  const d = sma(smoothedK, dPeriod);
  if (k == null || d == null) return null;
  return { k, d };
}

export function macd(closes: number[], fast: number, slow: number, signalPeriod: number) {
  const fastSeries = emaSeries(closes, fast);
  const slowSeries = emaSeries(closes, slow);
  if (!fastSeries.length || !slowSeries.length) return null;
  const offset = fastSeries.length - slowSeries.length;
  const line = slowSeries.map((v, i) => fastSeries[i + offset]! - v);
  const signalSeries = emaSeries(line, signalPeriod);
  const signal = signalSeries[signalSeries.length - 1];
  const value = line[line.length - 1];
  if (signal == null || value == null) return null;
  return { macd: value, signal, histogram: value - signal };
}

export function readIndicators(candles: Candle[], params: IndicatorParams): IndicatorReadings {
  const closes = candles.map((c) => c.c);
  return {
    bollinger: bollinger(closes, params.bollinger.period, params.bollinger.deviation),
    rsi: rsi(closes, params.rsi.period),
    stochastic: stochastic(candles, params.stochastic.k, params.stochastic.d, params.stochastic.smooth),
    macd: macd(closes, params.macd.fast, params.macd.slow, params.macd.signal),
  };
}

/** السرعة = تغيّر السعر لكل ثانية، والتسارع = تغيّر السرعة — من أزمنة الشموع الحقيقية. */
export function kinetics(candles: Candle[], lookback: number): Kinetics | null {
  if (candles.length < 4) return null;
  const window = candles.slice(-Math.max(4, lookback));
  const velocities: number[] = [];
  for (let i = 1; i < window.length; i++) {
    const dt = Math.max(1, (window[i]!.t - window[i - 1]!.t) / 1000);
    velocities.push((window[i]!.c - window[i - 1]!.c) / dt);
  }
  const abs = velocities.map(Math.abs);
  const velocity = abs[abs.length - 1]!;
  const averageVelocity = abs.reduce((a, b) => a + b, 0) / abs.length;
  const half = Math.floor(abs.length / 2);
  const older = abs.slice(0, half).reduce((a, b) => a + b, 0) / Math.max(1, half);
  const newer = abs.slice(half).reduce((a, b) => a + b, 0) / Math.max(1, abs.length - half);
  const acceleration = newer - older;
  const tolerance = averageVelocity * 0.1;
  return {
    velocity,
    averageVelocity,
    ratio: averageVelocity === 0 ? 0 : velocity / averageVelocity,
    acceleration,
    accelerationState:
      acceleration > tolerance ? "accelerating" : acceleration < -tolerance ? "decelerating" : "stable",
  };
}

/** قمم وقيعان محلية لبناء هيكل السوق (HH/HL/LH/LL) من شموع حقيقية. */
export function swings(candles: Candle[], left = 2, right = 2) {
  const highs: { t: number; price: number }[] = [];
  const lows: { t: number; price: number }[] = [];
  for (let i = left; i < candles.length - right; i++) {
    const c = candles[i]!;
    const window = candles.slice(i - left, i + right + 1);
    if (c.h === Math.max(...window.map((x) => x.h))) highs.push({ t: c.t, price: c.h });
    if (c.l === Math.min(...window.map((x) => x.l))) lows.push({ t: c.t, price: c.l });
  }
  return { highs: highs.slice(-4), lows: lows.slice(-4) };
}

export function structureFrom(candles: Candle[]): {
  label: "higher-highs" | "lower-lows" | "range" | "unclear";
  bias: "up" | "down" | "none";
} {
  const { highs, lows } = swings(candles);
  if (highs.length < 2 || lows.length < 2) return { label: "unclear", bias: "none" };
  const hh = highs[highs.length - 1]!.price > highs[highs.length - 2]!.price;
  const hl = lows[lows.length - 1]!.price > lows[lows.length - 2]!.price;
  if (hh && hl) return { label: "higher-highs", bias: "up" };
  if (!hh && !hl) return { label: "lower-lows", bias: "down" };
  return { label: "range", bias: "none" };
}
