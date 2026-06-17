-- Deeltaken / notitie-checklist per taak.
-- Opgeslagen als JSONB-array van { id: text, text: text, done: boolean }.
-- Bewust geen aparte tabel: deeltaken horen bij precies één taak, worden altijd
-- samen geladen, en een vinkje omzetten is daardoor één simpele UPDATE.
ALTER TABLE public.planner_taken
  ADD COLUMN IF NOT EXISTS subtasks JSONB NOT NULL DEFAULT '[]'::jsonb;
