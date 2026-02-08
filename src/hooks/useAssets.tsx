import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  tags: string[];
  region: string | null;
  country: string | null;
  subdivision: string | null;
}

export interface RouteData {
  id: string;
  user_id: string;
  name: string;
  start_label: string;
  start_lat: number;
  start_lng: number;
  end_label: string;
  end_lat: number;
  end_lng: number;
  checkpoints: { lat: number; lng: number; label: string }[];
  tags: string[];
  region: string | null;
  country: string | null;
  subdivision: string | null;
}

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [assetsRes, routesRes] = await Promise.all([
      supabase.from('assets').select('*').order('created_at', { ascending: true }),
      supabase.from('routes').select('*').order('created_at', { ascending: true }),
    ]);

    if (assetsRes.data) {
      setAssets(assetsRes.data.map((a: any) => ({
        id: a.id,
        user_id: a.user_id,
        name: a.name,
        type: a.type,
        lat: a.lat,
        lng: a.lng,
        tags: a.tags || [],
        region: a.region,
        country: a.country,
        subdivision: a.subdivision,
      })));
    }

    if (routesRes.data) {
      setRoutes(routesRes.data.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        name: r.name,
        start_label: r.start_label,
        start_lat: r.start_lat,
        start_lng: r.start_lng,
        end_label: r.end_label,
        end_lat: r.end_lat,
        end_lng: r.end_lng,
        checkpoints: Array.isArray(r.checkpoints) ? r.checkpoints : [],
        tags: r.tags || [],
        region: r.region,
        country: r.country,
        subdivision: r.subdivision,
      })));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    const assetChannel = supabase
      .channel('assets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => fetchAll())
      .subscribe();

    const routeChannel = supabase
      .channel('routes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(assetChannel);
      supabase.removeChannel(routeChannel);
    };
  }, [fetchAll]);

  const addAsset = useCallback(async (asset: Omit<Asset, 'id' | 'user_id'> & { user_id: string }) => {
    const { error } = await supabase.from('assets').insert(asset as any);
    if (!error) await fetchAll();
    return error;
  }, [fetchAll]);

  const deleteAsset = useCallback(async (id: string) => {
    const { error } = await supabase.from('assets').delete().eq('id', id);
    if (!error) setAssets(prev => prev.filter(a => a.id !== id));
    return error;
  }, []);

  const addRoute = useCallback(async (route: Omit<RouteData, 'id' | 'user_id'> & { user_id: string }) => {
    const { error } = await supabase.from('routes').insert({
      ...route,
      checkpoints: JSON.stringify(route.checkpoints),
    } as any);
    if (!error) await fetchAll();
    return error;
  }, [fetchAll]);

  const deleteRoute = useCallback(async (id: string) => {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (!error) setRoutes(prev => prev.filter(r => r.id !== id));
    return error;
  }, []);

  return { assets, routes, loading, addAsset, deleteAsset, addRoute, deleteRoute, refetch: fetchAll };
}
