
-- Escalations table
CREATE TABLE public.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id text NOT NULL,
  incident_title text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('urgent', 'high', 'routine')),
  assigned_to text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;

-- Users can view escalations they created or are assigned to
CREATE POLICY "Users can view own escalations"
  ON public.escalations FOR SELECT
  USING (auth.uid() = created_by);

-- Admins and analysts can view all escalations
CREATE POLICY "Admins can view all escalations"
  ON public.escalations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'analyst'));

-- Authenticated users can create escalations
CREATE POLICY "Users can create escalations"
  ON public.escalations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Admins can update escalations
CREATE POLICY "Admins can update escalations"
  ON public.escalations FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp trigger
CREATE TRIGGER update_escalations_updated_at
  BEFORE UPDATE ON public.escalations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
