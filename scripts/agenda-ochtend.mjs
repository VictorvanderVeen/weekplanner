// Agenda-ochtend — draait op de Mac (launchd co.veen.agenda-ochtend, werkdagen).
// Zet de afspraken van vandaag uit "Werk kalender" in Calendar/YYYY-MM-DD.md
// onder "## 🗓️ Afspraken". Waarom hier en niet in morning-brief.mjs: die draait
// sinds 15-10 op de server (obsidian-ochtend.timer), en daar is geen agenda.
//
// Maakt de dagnotitie nooit zelf aan: de server doet dat om 06:50 en Obsidian
// Sync brengt 'm hierheen. Een eigen versie zou een sync-conflict geven.
// Daarom wachten tot de notitie er is (max WACHT_MIN minuten).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const VAULT = process.env.AGENDA_VAULT_OVERRIDE || "/Users/victorvanderveen/Documents/Obsidian Vault";
const WACHT_MIN = 45;
const KOP = "## 🗓️ Afspraken";

const d = new Date();
const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const notePath = `${VAULT}/Calendar/${dateStr}.md`;
const log = (m) => console.log(`agenda ${dateStr} ${new Date().toTimeString().slice(0, 5)}: ${m}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// null = ophalen mislukt (sectie niet aanraken), [] = gelukt maar leeg.
function readAgenda() {
  try {
    const script = fileURLToPath(new URL("./agenda-vandaag.applescript", import.meta.url));
    const out = execFileSync("osascript", [script], { encoding: "utf8", timeout: 5 * 60 * 1000 });
    return out
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        const [t1, t2, titel, loc] = l.split("\t");
        return { t1, t2, titel: (titel || "").trim(), loc: (loc || "").trim() };
      })
      .sort((a, b) => a.t1.localeCompare(b.t1));
  } catch (e) {
    log(`⚠️  ophalen mislukt: ${e.message.split("\n")[0]}`);
    return null;
  }
}

// Vervangt de sectie, of zet 'm vóór "📋 Taken vandaag" (anders onder de titel).
function zetSectie(content, bodyLines) {
  const lines = content.split("\n");
  const block = [KOP, "", ...bodyLines, ""];
  const idx = lines.findIndex((l) => l.trim() === KOP);
  if (idx !== -1) {
    let end = lines.length;
    for (let i = idx + 1; i < lines.length; i++) if (/^## /.test(lines[i])) { end = i; break; }
    lines.splice(idx, end - idx, ...block);
  } else {
    let at = lines.findIndex((l) => l.trim() === "## 📋 Taken vandaag");
    if (at === -1) {
      const t = lines.findIndex((l) => /^# /.test(l));
      at = t !== -1 ? t + 2 : lines.length;
    }
    lines.splice(at, 0, ...block);
  }
  return lines.join("\n");
}

const deadline = Date.now() + WACHT_MIN * 60 * 1000;
while (!existsSync(notePath)) {
  if (Date.now() > deadline) {
    log(`❌ dagnotitie na ${WACHT_MIN} min nog niet binnen via Obsidian Sync — overgeslagen`);
    process.exit(1);
  }
  await sleep(30 * 1000);
}

const afspraken = readAgenda();
if (!afspraken) process.exit(1);

const body = afspraken.length
  ? afspraken.map(({ t1, t2, titel, loc }) =>
      `- ${t2 ? `${t1}–${t2}` : t1} ${titel}${loc ? ` — ${loc}` : ""} [afspraak:: true]`)
  : ["*Geen afspraken vandaag.*"];

// Pas ná de trage agenda-query lezen: Sync kan de notitie intussen bijgewerkt hebben.
writeFileSync(notePath, zetSectie(readFileSync(notePath, "utf8"), body), "utf8");
log(`🗓️  ${afspraken.length} afspraken gezet`);
