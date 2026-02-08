import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Incident = Tables<'incidents'>;

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = useCallback(async () => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('datetime', { ascending: false });

    if (data) setIncidents(data);
    if (error) console.error('Failed to fetch incidents:', error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIncidents();

    // Real-time subscription
    const channel = supabase
      .channel('incidents-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        () => {
          fetchIncidents();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchIncidents]);

  return { incidents, loading };
}
