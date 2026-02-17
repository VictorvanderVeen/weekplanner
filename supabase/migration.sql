-- Taken tabel
CREATE TABLE public.planner_taken (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task TEXT NOT NULL,
  client TEXT NOT NULL,
  hours NUMERIC(4,2) NOT NULL,
  day TEXT, -- NULL = inbox, anders 'Maandag'/'Dinsdag' etc.
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  completed BOOLEAN DEFAULT false,
  week_start DATE NOT NULL, -- maandag van de betreffende week, voor per-week filtering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Klanten tabel (per gebruiker)
CREATE TABLE public.planner_klanten (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  naam TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, naam)
);

-- Row Level Security
ALTER TABLE public.planner_taken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_klanten ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gebruikers zien alleen eigen taken"
  ON public.planner_taken FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Gebruikers zien alleen eigen klanten"
  ON public.planner_klanten FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
