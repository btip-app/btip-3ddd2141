
-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'office',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  tags TEXT[] DEFAULT '{}',
  region TEXT,
  country TEXT,
  subdivision TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Admins and analysts can insert assets" ON public.assets FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role) OR has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Admins and analysts can update assets" ON public.assets FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));
CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create routes table
CREATE TABLE public.routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_label TEXT NOT NULL,
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  end_label TEXT NOT NULL,
  end_lat DOUBLE PRECISION NOT NULL,
  end_lng DOUBLE PRECISION NOT NULL,
  checkpoints JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  region TEXT,
  country TEXT,
  subdivision TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view routes" ON public.routes FOR SELECT USING (true);
CREATE POLICY "Admins analysts operators can insert routes" ON public.routes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role) OR has_role(auth.uid(), 'operator'::app_role));
CREATE POLICY "Admins and analysts can update routes" ON public.routes FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));
CREATE POLICY "Admins can delete routes" ON public.routes FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.routes;
