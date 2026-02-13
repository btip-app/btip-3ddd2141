
-- Classification feedback table to track AI accuracy
CREATE TABLE public.classification_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  analyst_id UUID NOT NULL,
  feedback_type TEXT NOT NULL DEFAULT 'confirmed_correct', -- confirmed_correct, corrected
  original_category TEXT NOT NULL,
  original_severity INTEGER NOT NULL,
  original_confidence INTEGER NOT NULL,
  corrected_category TEXT,
  corrected_severity INTEGER,
  corrected_confidence INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classification_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins and analysts can view feedback"
ON public.classification_feedback FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins and analysts can insert feedback"
ON public.classification_feedback FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'analyst'::app_role));

CREATE POLICY "Admins can delete feedback"
ON public.classification_feedback FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_classification_feedback_incident ON public.classification_feedback(incident_id);
CREATE INDEX idx_classification_feedback_created ON public.classification_feedback(created_at);

-- Trigger to auto-capture feedback when analyst changes incident status from 'ai'
CREATE OR REPLACE FUNCTION public.capture_classification_feedback()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status changes FROM 'ai' to 'reviewed' or 'confirmed'
  IF OLD.status = 'ai' AND NEW.status IN ('reviewed', 'confirmed') THEN
    -- Determine if classification was corrected
    IF OLD.category = NEW.category AND OLD.severity = NEW.severity AND OLD.confidence = NEW.confidence THEN
      -- Analyst confirmed AI classification as correct
      INSERT INTO public.classification_feedback (
        incident_id, analyst_id, feedback_type,
        original_category, original_severity, original_confidence
      ) VALUES (
        NEW.id, auth.uid(), 'confirmed_correct',
        OLD.category, OLD.severity, OLD.confidence
      );
    ELSE
      -- Analyst corrected the classification
      INSERT INTO public.classification_feedback (
        incident_id, analyst_id, feedback_type,
        original_category, original_severity, original_confidence,
        corrected_category, corrected_severity, corrected_confidence
      ) VALUES (
        NEW.id, auth.uid(), 'corrected',
        OLD.category, OLD.severity, OLD.confidence,
        NEW.category, NEW.severity, NEW.confidence
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_capture_classification_feedback
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.capture_classification_feedback();

-- Enable realtime for the feedback table
ALTER PUBLICATION supabase_realtime ADD TABLE public.classification_feedback;
