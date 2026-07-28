
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-grant admin to founder email on signup (and any confirmation)
CREATE OR REPLACE FUNCTION public.grant_founder_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'brendahkizza1@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_grant_founder
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_founder_admin();

-- Backfill if the founder already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE lower(email) = 'brendahkizza1@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Demo versions
CREATE TABLE public.demo_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_label text NOT NULL,
  storage_path text NOT NULL,
  notes text,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX demo_versions_only_one_published
  ON public.demo_versions ((status)) WHERE status = 'published';

GRANT SELECT ON public.demo_versions TO anon, authenticated;
GRANT ALL ON public.demo_versions TO service_role;

ALTER TABLE public.demo_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published demo" ON public.demo_versions
  FOR SELECT TO anon, authenticated USING (status = 'published');

CREATE POLICY "Admins can view all demos" ON public.demo_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert demos" ON public.demo_versions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update demos" ON public.demo_versions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete demos" ON public.demo_versions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_demo_versions_updated_at
BEFORE UPDATE ON public.demo_versions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
