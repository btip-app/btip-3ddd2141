/**
 * Statistical Time-Series Forecasting Engine
 * Implements multiple forecasting methods for incident trend prediction.
 * No LLM dependency — pure statistical inference.
 */

export interface TimeSeriesPoint {
  date: string; // ISO date string (YYYY-MM-DD)
  value: number;
}

export interface ForecastPoint extends TimeSeriesPoint {
  lower: number; // confidence interval lower bound
  upper: number; // confidence interval upper bound
  method: string;
}

export interface ForecastResult {
  method: string;
  forecast: ForecastPoint[];
  mae: number;  // mean absolute error (backtested)
  mape: number; // mean absolute percentage error
  rmse: number; // root mean square error
}

// ──────────────── Helpers ────────────────

/** Fill gaps in daily series with zeros */
export function fillDailySeries(points: TimeSeriesPoint[], days: number): TimeSeriesPoint[] {
  if (points.length === 0) return [];
  
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map(sorted.map(p => [p.date, p.value]));
  
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  
  const filled: TimeSeriesPoint[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    filled.push({ date: key, value: map.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return filled;
}

/** Standard deviation */
function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
}

/** Generate future dates */
function futureDates(from: Date, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(from);
  for (let i = 1; i <= count; i++) {
    d.setDate(d.getDate() + 1);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ──────────────── Simple Moving Average ────────────────

export function forecastSMA(
  series: TimeSeriesPoint[],
  horizon: number = 7,
  window: number = 7
): ForecastResult {
  const values = series.map(p => p.value);
  if (values.length < window) {
    return { method: 'SMA', forecast: [], mae: Infinity, mape: Infinity, rmse: Infinity };
  }

  // Backtest
  const errors: number[] = [];
  for (let i = window; i < values.length; i++) {
    const avg = values.slice(i - window, i).reduce((a, b) => a + b, 0) / window;
    errors.push(Math.abs(values[i] - avg));
  }
  const mae = errors.length > 0 ? errors.reduce((a, b) => a + b, 0) / errors.length : 0;
  const rmse = errors.length > 0 ? Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / errors.length) : 0;
  const mape = errors.length > 0
    ? errors.reduce((s, e, i) => s + (values[window + i] !== 0 ? e / values[window + i] : 0), 0) / errors.length * 100
    : 0;

  // Forecast
  const lastWindow = values.slice(-window);
  const avg = lastWindow.reduce((a, b) => a + b, 0) / window;
  const sd = stddev(lastWindow);
  const dates = futureDates(new Date(series[series.length - 1].date), horizon);

  const forecast: ForecastPoint[] = dates.map(date => ({
    date,
    value: Math.max(0, Math.round(avg * 10) / 10),
    lower: Math.max(0, Math.round((avg - 1.96 * sd) * 10) / 10),
    upper: Math.round((avg + 1.96 * sd) * 10) / 10,
    method: 'SMA',
  }));

  return { method: `SMA(${window})`, forecast, mae, mape, rmse };
}

// ──────────────── Exponential Smoothing (Simple) ────────────────

export function forecastEMA(
  series: TimeSeriesPoint[],
  horizon: number = 7,
  alpha: number = 0.3
): ForecastResult {
  const values = series.map(p => p.value);
  if (values.length < 3) {
    return { method: 'EMA', forecast: [], mae: Infinity, mape: Infinity, rmse: Infinity };
  }

  // Compute smoothed series
  const smoothed: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
  }

  // Backtest
  const errors: number[] = [];
  for (let i = 1; i < values.length; i++) {
    errors.push(Math.abs(values[i] - smoothed[i - 1]));
  }
  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / errors.length);
  const mape = errors.reduce((s, e, i) => s + (values[i + 1] !== 0 ? e / values[i + 1] : 0), 0) / errors.length * 100;

  // Forecast
  const lastSmoothed = smoothed[smoothed.length - 1];
  const residuals = values.map((v, i) => v - smoothed[i]);
  const sd = stddev(residuals);
  const dates = futureDates(new Date(series[series.length - 1].date), horizon);

  const forecast: ForecastPoint[] = dates.map(date => ({
    date,
    value: Math.max(0, Math.round(lastSmoothed * 10) / 10),
    lower: Math.max(0, Math.round((lastSmoothed - 1.96 * sd) * 10) / 10),
    upper: Math.round((lastSmoothed + 1.96 * sd) * 10) / 10,
    method: 'EMA',
  }));

  return { method: `EMA(α=${alpha})`, forecast, mae, mape, rmse };
}

// ──────────────── Linear Regression ────────────────

export function forecastLinearRegression(
  series: TimeSeriesPoint[],
  horizon: number = 7
): ForecastResult {
  const values = series.map(p => p.value);
  const n = values.length;
  if (n < 3) {
    return { method: 'Linear', forecast: [], mae: Infinity, mape: Infinity, rmse: Infinity };
  }

  // Fit y = a + b*x
  const xs = values.map((_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let ssXY = 0, ssXX = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (xs[i] - xMean) * (values[i] - yMean);
    ssXX += (xs[i] - xMean) ** 2;
  }
  const b = ssXX !== 0 ? ssXY / ssXX : 0;
  const a = yMean - b * xMean;

  // Backtest
  const errors: number[] = [];
  for (let i = 0; i < n; i++) {
    const predicted = a + b * i;
    errors.push(Math.abs(values[i] - predicted));
  }
  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / errors.length);
  const mape = errors.reduce((s, e, i) => s + (values[i] !== 0 ? e / values[i] : 0), 0) / errors.length * 100;

  // Residual std for CI
  const residuals = values.map((v, i) => v - (a + b * i));
  const sd = stddev(residuals);

  const dates = futureDates(new Date(series[series.length - 1].date), horizon);
  const forecast: ForecastPoint[] = dates.map((date, i) => {
    const x = n + i;
    const predicted = a + b * x;
    return {
      date,
      value: Math.max(0, Math.round(predicted * 10) / 10),
      lower: Math.max(0, Math.round((predicted - 1.96 * sd) * 10) / 10),
      upper: Math.round((predicted + 1.96 * sd) * 10) / 10,
      method: 'Linear',
    };
  });

  return {
    method: `Linear (slope=${b.toFixed(2)}/day)`,
    forecast,
    mae, mape, rmse,
  };
}

// ──────────────── Holt's Double Exponential Smoothing ────────────────

export function forecastHolt(
  series: TimeSeriesPoint[],
  horizon: number = 7,
  alpha: number = 0.3,
  beta: number = 0.1
): ForecastResult {
  const values = series.map(p => p.value);
  const n = values.length;
  if (n < 4) {
    return { method: 'Holt', forecast: [], mae: Infinity, mape: Infinity, rmse: Infinity };
  }

  // Initialize
  let level = values[0];
  let trend = values[1] - values[0];
  const levels: number[] = [level];
  const trends: number[] = [trend];

  for (let i = 1; i < n; i++) {
    const newLevel = alpha * values[i] + (1 - alpha) * (level + trend);
    const newTrend = beta * (newLevel - level) + (1 - beta) * trend;
    level = newLevel;
    trend = newTrend;
    levels.push(level);
    trends.push(trend);
  }

  // Backtest (one-step-ahead)
  const errors: number[] = [];
  let l = values[0], t = values[1] - values[0];
  for (let i = 1; i < n; i++) {
    const pred = l + t;
    errors.push(Math.abs(values[i] - pred));
    const nl = alpha * values[i] + (1 - alpha) * (l + t);
    const nt = beta * (nl - l) + (1 - beta) * t;
    l = nl;
    t = nt;
  }
  const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / errors.length);
  const mape = errors.reduce((s, e, i) => s + (values[i + 1] !== 0 ? e / values[i + 1] : 0), 0) / errors.length * 100;

  // Residuals for CI
  const residuals = values.slice(1).map((v, i) => {
    const pred = levels[i] + trends[i];
    return v - pred;
  });
  const sd = stddev(residuals);

  const dates = futureDates(new Date(series[series.length - 1].date), horizon);
  const forecast: ForecastPoint[] = dates.map((date, i) => {
    const step = i + 1;
    const predicted = level + trend * step;
    const widening = sd * Math.sqrt(step); // CI widens with horizon
    return {
      date,
      value: Math.max(0, Math.round(predicted * 10) / 10),
      lower: Math.max(0, Math.round((predicted - 1.96 * widening) * 10) / 10),
      upper: Math.round((predicted + 1.96 * widening) * 10) / 10,
      method: 'Holt',
    };
  });

  return {
    method: `Holt (α=${alpha}, β=${beta})`,
    forecast,
    mae, mape, rmse,
  };
}

// ──────────────── Auto-select best model ────────────────

export interface AutoForecast {
  best: ForecastResult;
  all: ForecastResult[];
}

export function autoForecast(
  series: TimeSeriesPoint[],
  horizon: number = 7
): AutoForecast {
  const results = [
    forecastSMA(series, horizon, 7),
    forecastEMA(series, horizon, 0.3),
    forecastLinearRegression(series, horizon),
    forecastHolt(series, horizon, 0.3, 0.1),
  ].filter(r => r.forecast.length > 0 && isFinite(r.mae));

  if (results.length === 0) {
    return {
      best: { method: 'Insufficient Data', forecast: [], mae: 0, mape: 0, rmse: 0 },
      all: [],
    };
  }

  // Select model with lowest RMSE
  results.sort((a, b) => a.rmse - b.rmse);
  return { best: results[0], all: results };
}
