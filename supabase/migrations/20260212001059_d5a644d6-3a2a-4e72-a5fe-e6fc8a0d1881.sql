
-- Fix infinite recursion in profiles RLS policy
-- The "Users can view org members" policy references profiles within itself
DROP POLICY IF EXISTS "Users can view org members" ON public.profiles;

-- Recreate without self-reference using a security definer function
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "Users can view org members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    organization_id IS NOT NULL
    AND organization_id = public.get_my_organization_id()
  )
);
