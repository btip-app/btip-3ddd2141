
-- Create audit_log table for persistent activity tracking
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  context TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Any authenticated user can insert audit logs (their own actions)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only admins can delete audit logs
CREATE POLICY "Admins can delete audit logs"
ON public.audit_log
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast queries by category and time
CREATE INDEX idx_audit_log_category ON public.audit_log (category);
CREATE INDEX idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log (user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
