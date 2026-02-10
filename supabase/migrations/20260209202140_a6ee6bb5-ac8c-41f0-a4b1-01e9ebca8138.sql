
-- Table for account access requests (public insert, admin-only read)
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  role_requested TEXT NOT NULL DEFAULT 'viewer',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can submit a request
CREATE POLICY "Anyone can submit access requests"
  ON public.access_requests FOR INSERT
  WITH CHECK (true);

-- Only admins can view requests
CREATE POLICY "Admins can view access requests"
  ON public.access_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update requests (approve/deny)
CREATE POLICY "Admins can update access requests"
  ON public.access_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete requests
CREATE POLICY "Admins can delete access requests"
  ON public.access_requests FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
