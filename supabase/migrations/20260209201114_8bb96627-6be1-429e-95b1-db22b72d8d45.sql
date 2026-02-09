
-- Table for user-configurable OSINT sources
CREATE TABLE public.osint_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.osint_sources ENABLE ROW LEVEL SECURITY;

-- Admins and analysts can manage sources
CREATE POLICY "Admins and analysts can view sources"
  ON public.osint_sources FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can insert sources"
  ON public.osint_sources FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can update sources"
  ON public.osint_sources FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins can delete sources"
  ON public.osint_sources FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default sources
INSERT INTO public.osint_sources (url, label, created_by) VALUES
  ('https://www.aljazeera.com/tag/security/', 'Al Jazeera Security', '00000000-0000-0000-0000-000000000000'),
  ('https://www.bbc.com/news/topics/cwlw3xz047jt', 'BBC Conflicts', '00000000-0000-0000-0000-000000000000'),
  ('https://reliefweb.int/updates?view=reports&search=security+incident', 'ReliefWeb', '00000000-0000-0000-0000-000000000000');

-- Enable pg_cron and pg_net for scheduled ingestion
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
