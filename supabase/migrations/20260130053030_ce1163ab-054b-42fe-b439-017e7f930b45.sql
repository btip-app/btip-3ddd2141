-- Add 'executive' role to enum (viewer maps to executive)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'executive';

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Add organization_id to profiles
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- RLS policies for organizations
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (
  id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Update profiles RLS to allow viewing org members
CREATE POLICY "Users can view org members"
ON public.profiles FOR SELECT
USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
);

-- Trigger for organizations updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();