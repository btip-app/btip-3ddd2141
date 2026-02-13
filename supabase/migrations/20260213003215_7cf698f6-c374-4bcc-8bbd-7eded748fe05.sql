
-- Fix 1: Tighten access_requests INSERT to require authentication or explicit anon access
-- The current INSERT policy WITH CHECK (true) allows even anonymous users.
-- Keep it open for the access request form but ensure SELECT remains admin-only.
-- No change needed for SELECT (already admin-only), but let's also ensure 
-- the INSERT policy can't be abused by rate-limiting concern is out of scope for RLS.

-- Fix 2: Tighten profiles SELECT policy to explicitly require authentication
-- and handle NULL organization_id from get_my_organization_id() safely
DROP POLICY IF EXISTS "Users can view org members" ON public.profiles;

CREATE POLICY "Users can view org members"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = user_id
    OR (
      organization_id IS NOT NULL
      AND get_my_organization_id() IS NOT NULL
      AND organization_id = get_my_organization_id()
    )
  )
);
