
-- Raw events staging table for source provenance tracking
CREATE TABLE public.raw_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL, -- gdelt, telegram, firecrawl, reddit, twitter, acled, cyber, meta
  source_label text,
  source_url text,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text, -- SHA-256 of key fields for dedup
  status text NOT NULL DEFAULT 'raw', -- raw, normalized, duplicate, rejected
  incident_id uuid REFERENCES public.incidents(id) ON DELETE SET NULL,
  normalized_at timestamp with time zone,
  error_message text,
  ingested_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for dedup lookups
CREATE INDEX idx_raw_events_content_hash ON public.raw_events (content_hash);
CREATE INDEX idx_raw_events_status ON public.raw_events (status);
CREATE INDEX idx_raw_events_source_type ON public.raw_events (source_type);
CREATE INDEX idx_raw_events_ingested_at ON public.raw_events (ingested_at DESC);

-- Enable RLS
ALTER TABLE public.raw_events ENABLE ROW LEVEL SECURITY;

-- Admins and analysts can view raw events
CREATE POLICY "Admins and analysts can view raw events"
ON public.raw_events FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'analyst'));

-- Service role inserts (edge functions use service role key, bypasses RLS)
-- No INSERT policy needed for authenticated users since only edge functions write here

-- Admins can delete raw events
CREATE POLICY "Admins can delete raw events"
ON public.raw_events FOR DELETE
USING (has_role(auth.uid(), 'admin'));
