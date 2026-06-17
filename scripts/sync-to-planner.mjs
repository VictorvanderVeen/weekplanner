// Schrijft taken (met deeltaken) rechtstreeks in de weekplanner-database.
//
// Gebruik:
//   node scripts/sync-to-planner.mjs <tasks.json>           # invoegen
//   node scripts/sync-to-planner.mjs <tasks.json> --dry-run # alleen tonen
//
// tasks.json = array van objecten:
//   {
//     "task": "Titel van de taak",
//     "client": "NSGK",
//     "hours": 2,
//     "day": null,                 // null = inbox, of "Maandag".."Vrijdag"
//     "priority": "high",          // high | medium | low
//     "subtasks": ["deeltaak 1", "deeltaak 2"]   // platte strings
//   }
//
// Leest SUPABASE_URL, SUPABASE_SERVICE_KEY en PLANNER_USER_EMAIL uit .env.local.
// De service_role-sleutel omzeilt RLS; dit script hoort dus ALLEEN lokaal te draaien.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- mini .env.local-parser (geen extra dependency nodig) ---
function loadEnv(path = ".env.local") {
  let raw;
  try {
    raw = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  } catch {
    return {};
  }
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function mondayOfThisWeek() {
  const d = new Date();
  const offset = (d.getDay() + 6) % 7; // ma=0 .. zo=6
  d.setDate(d.getDate() - offset);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`; // lokale datum, net als de app
}

async function main() {
  const env = { ...loadEnv(), ...process.env };
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, PLANNER_USER_EMAIL } = env;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY === "PLAK_HIER_JE_SECRET_KEY") {
    console.error("❌ Vul SUPABASE_URL en SUPABASE_SERVICE_KEY in .env.local in.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("❌ Geef een tasks-JSON-bestand mee. Zie scripts/tasks.example.json.");
    process.exit(1);
  }

  const tasks = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(tasks) || tasks.length === 0) {
    console.error("❌ tasks-bestand is leeg of geen array.");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // user_id opzoeken via e-mail (service_role mag de admin-API gebruiken)
  const { data: list, error: userErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (userErr) { console.error("❌ Kon gebruikers niet ophalen:", userErr.message); process.exit(1); }
  const user = list.users.find((u) => u.email === PLANNER_USER_EMAIL);
  if (!user) { console.error(`❌ Geen gebruiker gevonden met e-mail ${PLANNER_USER_EMAIL}.`); process.exit(1); }

  const weekStart = mondayOfThisWeek();
  const rows = tasks.map((t) => ({
    user_id: user.id,
    task: t.task,
    client: t.client || "Overig",
    hours: Number(t.hours ?? 1),
    day: t.day ?? null,
    priority: t.priority || "medium",
    completed: false,
    week_start: weekStart,
    subtasks: (t.subtasks || []).map((s) =>
      typeof s === "string"
        ? { id: crypto.randomUUID(), text: s, done: false }
        : { id: s.id || crypto.randomUUID(), text: s.text, done: !!s.done }
    ),
  }));

  console.log(`→ ${rows.length} taak/taken voor ${PLANNER_USER_EMAIL}, week ${weekStart}:`);
  for (const r of rows) {
    console.log(`   • [${r.priority}] ${r.task} (${r.client}, ${r.hours}u, ${r.subtasks.length} deeltaken, ${r.day || "inbox"})`);
  }

  if (dryRun) { console.log("\n(dry-run — niets weggeschreven)"); return; }

  // klant(en) aanmaken indien nog niet aanwezig
  const clientNames = [...new Set(rows.map((r) => r.client))];
  await supabase
    .from("planner_klanten")
    .upsert(clientNames.map((naam) => ({ user_id: user.id, naam })), { onConflict: "user_id,naam", ignoreDuplicates: true });

  const { data, error } = await supabase.from("planner_taken").insert(rows).select("id");
  if (error) { console.error("❌ Invoegen mislukt:", error.message); process.exit(1); }
  console.log(`\n✅ ${data.length} taak/taken toegevoegd aan de planner.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
