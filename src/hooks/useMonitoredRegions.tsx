import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MonitoredRegion } from '@/components/dashboard/AddRegionDialog';

export function useMonitoredRegions() {
  const { user } = useAuth();
  const [regions, setRegions] = useState<MonitoredRegion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRegions = useCallback(async () => {
    if (!user) { setRegions([]); setLoading(false); return; }
    const { data } = await supabase
      .from('monitored_regions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (data) {
      setRegions(data.map(r => ({
        id: r.id,
        region: r.region,
        regionLabel: r.region_label,
        country: r.country,
        countryLabel: r.country_label,
        subdivision: r.subdivision ?? undefined,
        subdivisionLabel: r.subdivision_label ?? undefined,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const addRegion = useCallback(async (r: MonitoredRegion) => {
    if (!user) return;
    const { error } = await supabase.from('monitored_regions').insert({
      user_id: user.id,
      region: r.region,
      region_label: r.regionLabel,
      country: r.country,
      country_label: r.countryLabel,
      subdivision: r.subdivision ?? null,
      subdivision_label: r.subdivisionLabel ?? null,
    });
    if (!error) await fetchRegions();
    return error;
  }, [user, fetchRegions]);

  const removeRegion = useCallback(async (id: string) => {
    const { error } = await supabase.from('monitored_regions').delete().eq('id', id);
    if (!error) setRegions(prev => prev.filter(r => r.id !== id));
    return error;
  }, []);

  return { regions, loading, addRegion, removeRegion };
}
