
-- 1. Wipe existing shared data
DELETE FROM public.daily_entries;
DELETE FROM public.inventory_items;
DELETE FROM public.business_profiles;

-- 2. Drop old permissive policies
DROP POLICY IF EXISTS "Allow all access to daily_entries" ON public.daily_entries;
DROP POLICY IF EXISTS "Allow all access to inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Allow all access to business_profiles" ON public.business_profiles;

-- 3. Add user_id to existing tables
ALTER TABLE public.daily_entries
  ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_items
  ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.business_profiles
  ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX idx_daily_entries_user_id ON public.daily_entries(user_id);
CREATE INDEX idx_inventory_items_user_id ON public.inventory_items(user_id);
CREATE INDEX idx_business_profiles_user_id ON public.business_profiles(user_id);

-- 4. Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  business_name TEXT,
  contact TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Per-user RLS for daily_entries
CREATE POLICY "Users can view own daily_entries"
  ON public.daily_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily_entries"
  ON public.daily_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily_entries"
  ON public.daily_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily_entries"
  ON public.daily_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Per-user RLS for inventory_items
CREATE POLICY "Users can view own inventory_items"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory_items"
  ON public.inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory_items"
  ON public.inventory_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory_items"
  ON public.inventory_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Per-user RLS for business_profiles
CREATE POLICY "Users can view own business_profiles"
  ON public.business_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business_profiles"
  ON public.business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business_profiles"
  ON public.business_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own business_profiles"
  ON public.business_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, business_name, contact)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'business_name',
    NEW.raw_user_meta_data ->> 'contact'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
