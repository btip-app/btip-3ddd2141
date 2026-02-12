import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Entity {
  id: string;
  canonical_name: string;
  entity_type: string;
  description: string | null;
  country_affiliation: string | null;
  region: string | null;
  first_seen: string;
  last_seen: string;
  incident_count: number;
  confidence: number;
  metadata: any;
  created_at: string;
}

export interface EntityAlias {
  id: string;
  entity_id: string;
  alias: string;
  alias_normalized: string;
  source: string | null;
}

export interface IncidentEntity {
  id: string;
  incident_id: string;
  entity_id: string;
  role: string;
  confidence: number;
  extracted_name: string | null;
}

export function useEntities() {
  return useQuery({
    queryKey: ["entities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .order("incident_count", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as Entity[];
    },
  });
}

export function useEntityAliases(entityId: string | null) {
  return useQuery({
    queryKey: ["entity-aliases", entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const { data, error } = await supabase
        .from("entity_aliases")
        .select("*")
        .eq("entity_id", entityId);
      if (error) throw error;
      return data as EntityAlias[];
    },
    enabled: !!entityId,
  });
}

export function useEntityIncidents(entityId: string | null) {
  return useQuery({
    queryKey: ["entity-incidents", entityId],
    queryFn: async () => {
      if (!entityId) return [];
      const { data, error } = await supabase
        .from("incident_entities")
        .select("*, incidents(id, title, category, severity, datetime, country, region)")
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });
}

export function useRunEntityExtraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params?: { limit?: number; incident_ids?: string[] }) => {
      const { data, error } = await supabase.functions.invoke("extract-entities", {
        body: params || {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entities"] });
    },
  });
}
