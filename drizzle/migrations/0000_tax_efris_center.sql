CREATE TABLE public.tax_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tin text,
  brn text,
  legal_name text,
  business_address text,
  taxpayer_type text NOT NULL DEFAULT 'individual' CHECK (taxpayer_type IN ('individual','company')),
  vat_status text NOT NULL DEFAULT 'unknown' CHECK (vat_status IN ('unknown','not_registered','registered')),
  vat_registration_date date,
  prices_include_vat boolean NOT NULL DEFAULT true,
  efris_status text NOT NULL DEFAULT 'not_registered' CHECK (efris_status IN ('not_registered','applied','registered')),
  efris_device_no text,
  efris_connection text NOT NULL DEFAULT 'not_connected' CHECK (efris_connection IN ('not_connected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_profiles TO authenticated;
GRANT ALL ON public.tax_profiles TO service_role;
ALTER TABLE public.tax_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tax profile" ON public.tax_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tax_profiles_updated BEFORE UPDATE ON public.tax_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.efris_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  item_code text,
  commodity_code text,
  kind text NOT NULL DEFAULT 'product' CHECK (kind IN ('product','service')),
  unit text NOT NULL DEFAULT 'pcs',
  unit_price numeric NOT NULL DEFAULT 0,
  vat_category text NOT NULL DEFAULT 'standard' CHECK (vat_category IN ('standard','zero','exempt')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.efris_products TO authenticated;
GRANT ALL ON public.efris_products TO service_role;
ALTER TABLE public.efris_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own efris products" ON public.efris_products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.efris_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('invoice','receipt','credit_note','debit_note')),
  local_number text NOT NULL,
  related_document_id uuid REFERENCES public.efris_documents(id) ON DELETE SET NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_type text NOT NULL DEFAULT 'consumer' CHECK (customer_type IN ('consumer','business','government','foreigner')),
  customer_name text,
  customer_tin text,
  customer_brn text,
  customer_nin text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','issued_live','rejected_live')),
  fdn text,
  verification_code text,
  qr_code text,
  ura_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.efris_documents TO authenticated;
GRANT ALL ON public.efris_documents TO service_role;
ALTER TABLE public.efris_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own efris docs" ON public.efris_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER efris_documents_updated BEFORE UPDATE ON public.efris_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Live-only fields (FDN, verification code, QR, URA response, live statuses) can only be written by the server (future URA integration), never by the app user.
CREATE OR REPLACE FUNCTION public.guard_efris_live_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' OR auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.fdn IS NOT NULL OR NEW.verification_code IS NOT NULL OR NEW.qr_code IS NOT NULL OR NEW.ura_response IS NOT NULL OR NEW.status IN ('issued_live','rejected_live') THEN
        RAISE EXCEPTION 'Live EFRIS fields can only be set by a verified URA response';
      END IF;
    ELSE
      IF NEW.fdn IS DISTINCT FROM OLD.fdn OR NEW.verification_code IS DISTINCT FROM OLD.verification_code OR NEW.qr_code IS DISTINCT FROM OLD.qr_code OR NEW.ura_response IS DISTINCT FROM OLD.ura_response OR (NEW.status IS DISTINCT FROM OLD.status AND (NEW.status IN ('issued_live','rejected_live') OR OLD.status IN ('issued_live','rejected_live'))) THEN
        RAISE EXCEPTION 'Live EFRIS fields can only be set by a verified URA response';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_efris_live_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER efris_documents_guard BEFORE INSERT OR UPDATE ON public.efris_documents FOR EACH ROW EXECUTE FUNCTION public.guard_efris_live_fields();

CREATE TABLE public.tax_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  return_type text NOT NULL CHECK (return_type IN ('vat','income_tax','wht','paye')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  figures jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','reviewed','authorized','filed_manually','submitted_live','acknowledged_live')),
  authorized_at timestamptz,
  manual_ack_reference text,
  manual_filed_at date,
  ura_ack jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, return_type, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_returns TO authenticated;
GRANT ALL ON public.tax_returns TO service_role;
ALTER TABLE public.tax_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tax returns" ON public.tax_returns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tax_returns_updated BEFORE UPDATE ON public.tax_returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.guard_tax_return_live_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.status IN ('submitted_live','acknowledged_live') AND (TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION 'Only a verified URA response can mark a return as submitted';
    END IF;
    IF (TG_OP = 'INSERT' AND NEW.ura_ack IS NOT NULL) OR (TG_OP = 'UPDATE' AND NEW.ura_ack IS DISTINCT FROM OLD.ura_ack) THEN
      RAISE EXCEPTION 'Only a verified URA response can set acknowledgement data';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_tax_return_live_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER tax_returns_guard BEFORE INSERT OR UPDATE ON public.tax_returns FOR EACH ROW EXECUTE FUNCTION public.guard_tax_return_live_fields();