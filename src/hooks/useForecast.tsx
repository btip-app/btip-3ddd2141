import { useState, useMemo } from 'react';
import { useIncidents } from '@/hooks/useIncidents';
import {
  fillDailySeries, autoForecast,
  type TimeSeriesPoint, type AutoForecast,
} from '@/lib/forecasting';

export interface CategoryForecast {
  category: string;
  series: TimeSeriesPoint[];
  forecast: AutoForecast;
}

export function useForecast(lookbackDays: number = 60, horizon: number = 14) {
  const { incidents, loading } = useIncidents();

  const globalForecast = useMemo(() => {
    if (incidents.length === 0) return null;

    // Aggregate to daily counts
    const daily: Record<string, number> = {};
    for (const inc of incidents) {
      const day = inc.datetime.slice(0, 10);
      daily[day] = (daily[day] || 0) + 1;
    }
    const raw: TimeSeriesPoint[] = Object.entries(daily).map(([date, value]) => ({ date, value }));
    const series = fillDailySeries(raw, lookbackDays);
    return { series, forecast: autoForecast(series, horizon) };
  }, [incidents, lookbackDays, horizon]);

  const severityForecast = useMemo(() => {
    if (incidents.length === 0) return null;

    const daily: Record<string, { sum: number; count: number }> = {};
    for (const inc of incidents) {
      const day = inc.datetime.slice(0, 10);
      if (!daily[day]) daily[day] = { sum: 0, count: 0 };
      daily[day].sum += inc.severity;
      daily[day].count++;
    }
    const raw: TimeSeriesPoint[] = Object.entries(daily).map(([date, v]) => ({
      date,
      value: Math.round((v.sum / v.count) * 10) / 10,
    }));
    const series = fillDailySeries(raw, lookbackDays);
    return { series, forecast: autoForecast(series, horizon) };
  }, [incidents, lookbackDays, horizon]);

  const categoryForecasts: CategoryForecast[] = useMemo(() => {
    if (incidents.length === 0) return [];

    const categories = [...new Set(incidents.map(i => i.category))];
    return categories.map(category => {
      const catIncidents = incidents.filter(i => i.category === category);
      const daily: Record<string, number> = {};
      for (const inc of catIncidents) {
        const day = inc.datetime.slice(0, 10);
        daily[day] = (daily[day] || 0) + 1;
      }
      const raw: TimeSeriesPoint[] = Object.entries(daily).map(([date, value]) => ({ date, value }));
      const series = fillDailySeries(raw, lookbackDays);
      return { category, series, forecast: autoForecast(series, horizon) };
    }).sort((a, b) => {
      const aTotal = a.series.reduce((s, p) => s + p.value, 0);
      const bTotal = b.series.reduce((s, p) => s + p.value, 0);
      return bTotal - aTotal;
    });
  }, [incidents, lookbackDays, horizon]);

  const regionForecasts = useMemo(() => {
    if (incidents.length === 0) return [];

    const regions = [...new Set(incidents.map(i => i.region).filter(Boolean))];
    return regions.map(region => {
      const regIncidents = incidents.filter(i => i.region === region);
      const daily: Record<string, number> = {};
      for (const inc of regIncidents) {
        const day = inc.datetime.slice(0, 10);
        daily[day] = (daily[day] || 0) + 1;
      }
      const raw: TimeSeriesPoint[] = Object.entries(daily).map(([date, value]) => ({ date, value }));
      const series = fillDailySeries(raw, lookbackDays);
      return { region, series, forecast: autoForecast(series, horizon) };
    }).sort((a, b) => {
      const aTotal = a.series.reduce((s, p) => s + p.value, 0);
      const bTotal = b.series.reduce((s, p) => s + p.value, 0);
      return bTotal - aTotal;
    });
  }, [incidents, lookbackDays, horizon]);

  return { globalForecast, severityForecast, categoryForecasts, regionForecasts, loading };
}
