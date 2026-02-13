
-- Entity types enum
CREATE TYPE public.entity_type AS ENUM ('threat_actor', 'organization', 'armed_group', 'government', 'person', 'location_group');

-- Core entities table
CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  entity_type entity_type NOT NULL,
  description text,
  country_affiliation text,
  region text,
  first_seen timestamp with time zone NOT NULL DEFAULT now(),
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  incident_count integer NOT NULL DEFAULT 0,
  confidence integer NOT NULL DEFAULT 50,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Aliases for entity resolution
CREATE TABLE public.entity_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  alias text NOT NULL,
  alias_normalized text NOT NULL, -- lowercase, stripped for matching
  source text, -- which pipeline first saw this alias
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(alias_normalized)
);

-- Junction: incidents <-> entities (many-to-many)
CREATE TABLE public.incident_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'mentioned', -- perpetrator, target, mentioned, affiliated
  confidence integer NOT NULL DEFAULT 50,
  extracted_name text, -- the raw name as extracted from source
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(incident_id, entity_id, role)
);

-- Indexes
CREATE INDEX idx_entities_type ON public.entities(entity_type);
CREATE INDEX idx_entities_canonical ON public.entities(canonical_name);
CREATE INDEX idx_entities_last_seen ON public.entities(last_seen DESC);
CREATE INDEX idx_entity_aliases_normalized ON public.entity_aliases(alias_normalized);
CREATE INDEX idx_entity_aliases_entity ON public.entity_aliases(entity_id);
CREATE INDEX idx_incident_entities_incident ON public.incident_entities(incident_id);
CREATE INDEX idx_incident_entities_entity ON public.incident_entities(entity_id);

-- RLS
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_entities ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Authenticated users can view entities"
ON public.entities FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view aliases"
ON public.entity_aliases FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view incident entities"
ON public.incident_entities FOR SELECT USING (true);

-- Write access for admins and analysts
CREATE POLICY "Admins and analysts can manage entities"
ON public.entities FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Admins and analysts can manage aliases"
ON public.entity_aliases FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

CREATE POLICY "Admins and analysts can manage incident entities"
ON public.incident_entities FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

-- Trigger to update entity timestamps
CREATE TRIGGER update_entities_updated_at
BEFORE UPDATE ON public.entities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to update entity incident_count and last_seen
CREATE OR REPLACE FUNCTION public.update_entity_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.entities
  SET 
    incident_count = (SELECT count(*) FROM public.incident_entities WHERE entity_id = NEW.entity_id),
    last_seen = now()
  WHERE id = NEW.entity_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_entity_stats_on_link
AFTER INSERT ON public.incident_entities
FOR EACH ROW EXECUTE FUNCTION public.update_entity_stats();
