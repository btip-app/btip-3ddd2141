
-- Add explicit deny policies for organizations write operations
CREATE POLICY "Deny anonymous insert on organizations"
ON public.organizations FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Deny anonymous update on organizations"
ON public.organizations FOR UPDATE
TO anon
USING (false);

CREATE POLICY "Deny anonymous delete on organizations"
ON public.organizations FOR DELETE
TO anon
USING (false);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own monitored regions
CREATE POLICY "Users can update own regions"
ON public.monitored_regions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
