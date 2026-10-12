// Morning Brief — draait elke ochtend via LaunchAgent.
// Leest de "🔴 Vandaag"-taken rechtstreeks uit de Obsidian-dashboards
// (sinds 14-8 niet meer uit Supabase), schrijft/ververst de "## 📋 Taken
// vandaag"-sectie in Calendar/YYYY-MM-DD.md, en stuurt een macOS-notificatie.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { getQueue } from "../../vragenronde/lib/obsidian-queue.mjs";

const DAGEN = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const MAANDEN = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function notify(title, body) {
  const escaped = body.replace(/"/g, '\\"');
  execSync(
    `osascript -e 'display notification "${escaped}" with title "${title}" subtitle "Open Claude Code → /chief"'`
  );
}

// Vervangt (of voegt toe) de inhoud onder `heading` in een dagnotitie, zonder
// de rest van het bestand (afspraken, chief-overzicht, eigen aantekeningen)
// aan te raken — zelfde principe als de vaste secties die /chief bijwerkt.
function replaceSection(content, heading, bodyLines) {
  const lines = content.split("\n");
  const block = [heading, "", ...bodyLines, ""];
  const idx = lines.findIndex((l) => l.trim() === heading);
  if (idx === -1) {
    const titleIdx = lines.findIndex((l) => /^# /.test(l));
    const insertAt = titleIdx !== -1 ? titleIdx + 1 : lines.length;
    lines.splice(insertAt, 0, "", ...block);
    return lines.join("\n");
  }
  let end = lines.length;
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^## /.test(lines[i])) { end = i; break; }
  }
  lines.splice(idx, end - idx, ...block);
  return lines.join("\n");
}

const VAULT = "/Users/victorvanderveen/Documents/Obsidian Vault";

const today = new Date();
const dagNaam = DAGEN[today.getDay()];
const dateStr = isoDate(today);
const dagLang = `${dagNaam} ${today.getDate()} ${MAANDEN[today.getMonth()]}`;

const { queue } = getQueue({ vaultPath: VAULT, mode: "full" });
const vandaag = queue.filter((t) => t.header === "### 🔴 Vandaag");

const bodyLines = vandaag.length
  ? vandaag.map((t) => `- [ ] **${t.client}** — ${t.text}${t.due ? ` [due:: ${t.due}]` : ""}`)
  : ["*Geen taken onder 🔴 Vandaag — check de dashboards of draai `/chief vragenronde`.*"];

const calDir = `${VAULT}/Calendar`;
if (!existsSync(calDir)) mkdirSync(calDir, { recursive: true });
const calPath = `${calDir}/${dateStr}.md`;

let content;
if (existsSync(calPath)) {
  content = readFileSync(calPath, "utf8");
} else {
  content = `---\ndatum: ${dateStr}\ndag: ${dagNaam}\ntags: [dagnotitie]\n---\n\n# ${dagLang}\n\n## 📝 Notities\n\n`;
}
content = replaceSection(content, "## 📋 Taken vandaag", bodyLines);
writeFileSync(calPath, content, "utf8");
console.log(`✅ "Taken vandaag" ververst in ${calPath} (${vandaag.length} taken)`);

try {
  const body = vandaag.length ? `${vandaag.length} taken onder 🔴 Vandaag` : "Niks onder 🔴 Vandaag — vrije dag of alles klaar!";
  notify("Chief of Staff", body);
  console.log(`🔔 Notificatie: ${body}`);
} catch (e) {
  console.warn("⚠️  Notificatie mislukt:", e.message);
}
