// Morning Brief — draait elke ochtend via LaunchAgent.
// Zet in Calendar/YYYY-MM-DD.md onder "## 📋 Taken vandaag" een live
// Dataview-lijst van de "🔴 Vandaag"-taken uit de Obsidian-dashboards, en
// stuurt een macOS-notificatie met het aantal (geteld uit de dashboards).

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
// Nieuwe sectie komt direct ná `afterHeading` (als die bestaat), anders onder de titel.
function replaceSection(content, heading, bodyLines, afterHeading = null) {
  const lines = content.split("\n");
  const block = [heading, "", ...bodyLines, ""];
  const idx = lines.findIndex((l) => l.trim() === heading);
  if (idx === -1) {
    const afterIdx = afterHeading ? lines.findIndex((l) => l.trim() === afterHeading) : -1;
    let insertAt;
    if (afterIdx !== -1) {
      insertAt = lines.length;
      for (let i = afterIdx + 1; i < lines.length; i++) {
        if (/^## /.test(lines[i])) { insertAt = i; break; }
      }
      lines.splice(insertAt, 0, ...block);
    } else {
      const titleIdx = lines.findIndex((l) => /^# /.test(l));
      insertAt = titleIdx !== -1 ? titleIdx + 1 : lines.length;
      lines.splice(insertAt, 0, "", ...block);
    }
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

// Live Dataview-lijst i.p.v. een geplakte kopie (sinds 14-10): afvinken hier
// vinkt de taak in het dashboard zelf af. Een kopie liet het dashboard
// ongemoeid, waardoor afgevinkte taken de volgende ochtend terugkwamen.
// Filter op de kop is getest (14-10): exacte "🔴 Vandaag" vindt alles.
const bodyLines = [
  "```dataview",
  "TASK",
  'FROM "Projecten" AND -"Projecten/Archief"',
  'WHERE !completed AND meta(section).subpath = "🔴 Vandaag"',
  'GROUP BY regexreplace(file.folder, "Projecten/", "")',
  "```",
];

// Vervangt sinds 14-10 het losse hoofddashboard (0 dashboard.md) en de
// overzichtspagina's: alles wat Victor naast "vandaag" wil zien, live in de
// dagnotitie. TASK-queries zijn afvinkbaar (schrijven terug naar de bron).
const KLANT = 'regexreplace(file.folder, "Projecten/", "")';
const overzichtLines = [
  // Elk uur gevuld door voice-memo-pipeline (co.veen.voice-memos).
  "### 🎙️ Ingesproken (nog niet ingedeeld)",
  "```dataview",
  "TASK",
  'FROM "Inbox/Voice Memos"',
  "WHERE !completed",
  "GROUP BY file.link",
  "```",
  "",
  "### ⚠️ Achterstallig",
  "```dataview",
  "TASK",
  'FROM "Projecten" AND -"Projecten/Archief"',
  "WHERE !completed AND due AND due < date(today)",
  `GROUP BY ${KLANT}`,
  "```",
  "",
  "### 📅 Deadlines komende 14 dagen",
  "```dataview",
  "TASK",
  'FROM "Projecten" AND -"Projecten/Archief"',
  "WHERE !completed AND due AND due >= date(today) AND due <= date(today) + dur(14 days)",
  "SORT due ASC",
  `GROUP BY ${KLANT}`,
  "```",
  "",
  "### 🏠 Privé",
  "```dataview",
  "TASK",
  // Niet: oude geplakte Vandaag-kopieën en Chief-overzichten (vóór 14-10) en het archief.
  'FROM "Calendar" AND -"Calendar/Archief"',
  "WHERE !completed AND text != \"\" AND length(outlinks) = 0 AND file.path != this.file.path",
  '  AND !contains(meta(section).subpath, "Taken vandaag") AND !contains(meta(section).subpath, "Chief")',
  "GROUP BY file.link",
  "```",
  "",
  "### 👥 Klanten",
  "```dataview",
  "TABLE WITHOUT ID",
  `  link(file.link, ${KLANT}) AS "Klant",`,
  '  length(filter(file.tasks, (t) => !t.completed)) AS "Open taken",',
  '  deadline AS "Deadline"',
  'FROM "Projecten" AND -"Projecten/Archief"',
  'WHERE type = "klant"',
  "SORT deadline ASC",
  "```",
  "",
  "> [!todo]- Alle open taken per klant (klik om uit te klappen)",
  "> ```dataview",
  "> TASK",
  '> FROM "Projecten" AND -"Projecten/Archief"',
  "> WHERE !completed",
  `> GROUP BY ${KLANT}`,
  "> ```",
];

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
content = replaceSection(content, "## 🔭 Overzicht", overzichtLines, "## 📋 Taken vandaag");
writeFileSync(calPath, content, "utf8");
console.log(`✅ "Taken vandaag" ververst in ${calPath} (${vandaag.length} taken)`);

try {
  const body = vandaag.length ? `${vandaag.length} taken onder 🔴 Vandaag` : "Niks onder 🔴 Vandaag — vrije dag of alles klaar!";
  notify("Chief of Staff", body);
  console.log(`🔔 Notificatie: ${body}`);
} catch (e) {
  console.warn("⚠️  Notificatie mislukt:", e.message);
}
