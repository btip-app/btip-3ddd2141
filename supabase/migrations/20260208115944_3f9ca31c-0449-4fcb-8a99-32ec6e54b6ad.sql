
-- Create incident status enum
CREATE TYPE public.incident_status AS ENUM ('ai', 'reviewed', 'confirmed');

-- Create incidents table
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  datetime timestamp with time zone NOT NULL DEFAULT now(),
  location text NOT NULL,
  severity integer NOT NULL CHECK (severity BETWEEN 1 AND 5),
  confidence integer NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  status incident_status NOT NULL DEFAULT 'ai',
  category text NOT NULL,
  region text NOT NULL,
  country text,
  subdivision text,
  trend text,
  summary text,
  sources text[],
  analyst text,
  section text NOT NULL DEFAULT 'top_threats',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read incidents
CREATE POLICY "Authenticated users can view incidents"
  ON public.incidents FOR SELECT TO authenticated
  USING (true);

-- Admins and analysts can insert
CREATE POLICY "Admins and analysts can insert incidents"
  ON public.incidents FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst')
  );

-- Admins and analysts can update
CREATE POLICY "Admins and analysts can update incidents"
  ON public.incidents FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'analyst')
  );

-- Only admins can delete
CREATE POLICY "Admins can delete incidents"
  ON public.incidents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
