import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type RawEvent = Tables<'raw_events'>;

export interface PipelineStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, { total: number; normalized: number; failed: number; duplicate: number }>;
  recentRate: number; // events per hour (last 24h)
  errorRate: number;
}

export function useRawEvents() {
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from('raw_events')
      .select('*')
      .order('ingested_at', { ascending: false })
      .limit(500);

    if (data) setEvents(data);
    if (error) console.error('Failed to fetch raw events:', error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEvents();
    const channel = supabase
      .channel('raw-events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raw_events' }, () => fetchEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchEvents]);

  const stats: PipelineStats = useMemo(() => {
    const total = events.length;
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, { total: number; normalized: number; failed: number; duplicate: number }> = {};

    for (const e of events) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;

      if (!bySource[e.source_type]) bySource[e.source_type] = { total: 0, normalized: 0, failed: 0, duplicate: 0 };
      bySource[e.source_type].total++;
      if (e.status === 'normalized') bySource[e.source_type].normalized++;
      if (e.status === 'rejected') bySource[e.source_type].failed++;
      if (e.status === 'duplicate') bySource[e.source_type].duplicate++;
    }

    const now = Date.now();
    const last24h = events.filter(e => now - new Date(e.ingested_at).getTime() < 86400000);
    const recentRate = last24h.length / 24;

    const failed = events.filter(e => e.status === 'rejected').length;
    const errorRate = total > 0 ? (failed / total) * 100 : 0;

    return { total, byStatus, bySource, recentRate, errorRate };
  }, [events]);

  return { events, loading, stats, refetch: fetchEvents };
}
