
CREATE TABLE public.monitored_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  region text NOT NULL,
  region_label text NOT NULL,
  country text NOT NULL,
  country_label text NOT NULL,
  subdivision text,
  subdivision_label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, region, country, subdivision)
);

ALTER TABLE public.monitored_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own regions" ON public.monitored_regions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own regions" ON public.monitored_regions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own regions" ON public.monitored_regions
  FOR DELETE USING (auth.uid() = user_id);
