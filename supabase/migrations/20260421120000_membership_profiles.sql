-- ========================================================================
-- Scaffold-only membership table. Keyed by auth.users.id directly so the
-- capacitor-standard scaffold does not need an app-specific public.users
-- table or any RPCs. billing-status / billing-sync-revenuecat read and
-- write this single table.
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.membership_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro')),
  status TEXT NOT NULL DEFAULT 'free'
    CHECK (status IN ('free', 'active', 'grace_period', 'billing_issue', 'expired')),
  provider TEXT CHECK (provider IN ('revenuecat')),
  store TEXT CHECK (store IN ('app_store', 'play_store')),
  product_id TEXT,
  entitlement_key TEXT,
  expires_at TIMESTAMPTZ,
  will_renew BOOLEAN,
  environment TEXT CHECK (environment IN ('sandbox', 'production')),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_profiles_status_tier
  ON public.membership_profiles(status, tier);

ALTER TABLE public.membership_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'membership_profiles'
      AND policyname = 'Users can view own membership profile'
  ) THEN
    CREATE POLICY "Users can view own membership profile"
      ON public.membership_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT ON TABLE public.membership_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.membership_profiles TO service_role;

CREATE OR REPLACE FUNCTION public.touch_membership_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_membership_profiles_updated_at
  ON public.membership_profiles;
CREATE TRIGGER trg_touch_membership_profiles_updated_at
  BEFORE UPDATE ON public.membership_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_membership_profiles_updated_at();
