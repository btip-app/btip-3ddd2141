
-- Replace overly permissive insert policy with a restrictive one
DROP POLICY "System can insert notifications" ON public.notifications;

-- The trigger function runs as SECURITY DEFINER so it bypasses RLS.
-- For any direct inserts, only allow users to insert for themselves.
CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
