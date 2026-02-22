-- Subscriptions tabel
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'past_due', 'canceled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: gebruikers kunnen alleen hun eigen subscription zien
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruikers zien alleen eigen subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Automatisch subscription-rij aanmaken bij nieuwe signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status)
  VALUES (NEW.id, 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: bestaande gebruikers krijgen een subscription-rij
INSERT INTO public.subscriptions (user_id, status)
SELECT id, 'active' FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions);
