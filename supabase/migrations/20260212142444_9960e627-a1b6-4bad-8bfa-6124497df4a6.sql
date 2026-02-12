
-- Table for user-configured Telegram public channels to monitor
CREATE TABLE public.telegram_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate channel entries
CREATE UNIQUE INDEX idx_telegram_channels_username ON public.telegram_channels (username);

-- Enable RLS
ALTER TABLE public.telegram_channels ENABLE ROW LEVEL SECURITY;

-- Admins and analysts can view
CREATE POLICY "Admins and analysts can view telegram channels"
  ON public.telegram_channels FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Admins and analysts can insert
CREATE POLICY "Admins and analysts can insert telegram channels"
  ON public.telegram_channels FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Admins and analysts can update
CREATE POLICY "Admins and analysts can update telegram channels"
  ON public.telegram_channels FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

-- Admins can delete
CREATE POLICY "Admins can delete telegram channels"
  ON public.telegram_channels FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
