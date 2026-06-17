-- Seed: NSGK-todo's als geclusterde taken in de weekplanner-inbox.
-- Draai dit ÉÉNMALIG in de Supabase SQL-editor, NA migration_003_subtasks.sql.
-- Het zoekt je user_id op via e-mail en zet 5 clusters in de inbox (day = NULL)
-- van de huidige week. Pas 'victor@veen.co' aan als je een ander account gebruikt.

with me as (
  select id as user_id from auth.users where email = 'victor@veen.co'
)
-- Zorg dat "NSGK" als klant bestaat (voor kleurlabel + dropdown)
, ins_client as (
  insert into public.planner_klanten (user_id, naam)
  select user_id, 'NSGK' from me
  on conflict (user_id, naam) do nothing
  returning 1
)
insert into public.planner_taken
  (user_id, task, client, hours, day, priority, completed, week_start, subtasks)
select me.user_id, t.task, 'NSGK', t.hours, null, t.priority, false,
       date_trunc('week', now())::date, t.subtasks
from me, (values
  (
    'NSGK – ⚠️ Nu oppakken (tijdgevoelig)', 1.0, 'high',
    '[
      {"id":"u1","text":"GA4-verificatie: in property EMR (G-G3CDL5BEMR) checken of marathon-verkeer écht gestopt is — deadline verstreken","done":false},
      {"id":"u2","text":"VOG inleveren bij Laura (HR) — nog niet binnen","done":false}
    ]'::jsonb
  ),
  (
    'NSGK – GA4 / Marathon-tracking', 4.0, 'high',
    '[
      {"id":"g1","text":"Conversion Linker-tag in GTM-MS6ZKW3 (trigger All Pages) — eerst dit","done":false},
      {"id":"g2","text":"Remarketing-tag Paid (Marathon) — conversie-ID 619131472, All Pages","done":false},
      {"id":"g3","text":"Remarketing-tag Grants (Marathon) — conversie-ID 1031207036, All Pages","done":false},
      {"id":"g4","text":"Consent koppelen aan alle 3 tags (Cookiebot, marketing) — AVG-risico","done":false},
      {"id":"g5","text":"Testen in Preview + publiceren","done":false},
      {"id":"g6","text":"Audience Marathon–website-bezoekers in AW-619131472 (Paid), hostname bevat megawandelmarathon.nl","done":false},
      {"id":"g7","text":"Zelfde audience in AW-1031207036 (Grants)","done":false},
      {"id":"g8","text":"Fase 3: conversie-acties bepalen + per Ads-account aanmaken + tags bouwen/testen/publiceren","done":false},
      {"id":"g9","text":"Tag in marathon-container hernoemen naar Marathon + ID (nu GA4 - config)","done":false},
      {"id":"g10","text":"Bij NSGK navragen of Ads-opzet (beide accounts, marathon apart) klopt","done":false}
    ]'::jsonb
  ),
  (
    'NSGK – Campagnevragen Manon (Samen naar school)', 1.0, 'medium',
    '[
      {"id":"c1","text":"Advies donatie-flow: alleen landingspagina of ook bevestiging + bedank-mail?","done":false},
      {"id":"c2","text":"Meta-budget: adviseer je vooraf inkopen? (max €10K/mnd, geen achteraf-facturatie)","done":false},
      {"id":"c3","text":"Doelgroep: reageren op voorstel 55+/oma''s/zorgmedewerkers i.p.v. moeders","done":false},
      {"id":"c4","text":"Kleinere review-punten in deck: namen (Anna & Lies), foto''s 3 koppeltjes, briefing, herkennen","done":false}
    ]'::jsonb
  ),
  (
    'NSGK – Onboarding / praktisch', 1.0, 'medium',
    '[
      {"id":"o1","text":"Leermodules doornemen (nsgk.sharepoint.com/sites/leermodules, ~45 min)","done":false},
      {"id":"o2","text":"Outlook-handtekening instellen + wachtwoord aanpassen","done":false},
      {"id":"o3","text":"Facturen sturen naar facturen@gehandicaptekind.nl mét urenverantwoording","done":false}
    ]'::jsonb
  ),
  (
    'NSGK – Wacht op NSGK (opvolgen)', 0.5, 'low',
    '[
      {"id":"w1","text":"Manon: scripts weghalen bij Samennaarschool + check Iraiser/Kentaa/EF2 (Meta Pixel, Leadinfo, Hotjar)","done":false},
      {"id":"w2","text":"Maartje: bevestiging Sazza-/andere onderzoeken inclusief onderwijs","done":false}
    ]'::jsonb
  )
) as t(task, hours, priority, subtasks);
