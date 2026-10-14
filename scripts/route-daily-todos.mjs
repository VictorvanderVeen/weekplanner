// Scant de laatste 7 dagnotities (Calendar/*.md) op losse to-do's die Victor
// onderweg intikt met een #Klant-tag, en zet ze over naar het juiste
// klantdashboard onder "## 📥 Vanuit dagboekje". De regel in de dagnotitie
// wordt afgevinkt + doorgestreept zodat 'ie niet dubbel opgepikt wordt, maar
// blijft zichtbaar staan (geen dataverlies, gewoon een spoor).
//
// Conventie in de dagnotitie: "- #Klant Tekst van de taak" (het hokje "[ ]" mag,
// hoeft niet — sinds 14-10, typt makkelijker onder "## ➕ Nieuwe taken")
// Voorbeeld:   - #UAF Bel Karel over Tag Manager
//              - [ ] #prive Tandarts bellen
//
// Gebruik:
//   node scripts/route-daily-todos.mjs            # voert door
//   node scripts/route-daily-todos.mjs --dry-run   # toont alleen wat er zou gebeuren

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { findActionsSection, findHeaderBlock, insertTaskUnderHeader } from "../../vragenronde/lib/dashboard-parser.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT = process.env.TODO_ROUTER_VAULT_OVERRIDE || "/Users/victorvanderveen/Documents/Obsidian Vault";
const CALENDAR_DIR = join(VAULT, "Calendar");
const PROJECTEN_DIR = join(VAULT, "Projecten");
const DRY_RUN = process.argv.includes("--dry-run");

// Obsidian-tags mogen geen spaties/leestekens bevatten — vandaar aliassen
// zonder spaties die naar de echte (wel-met-spaties) mapnaam wijzen.
const TAG_TO_FOLDER = {
  uaf: "UAF",
  mindwise: "Mindwise",
  nsgk: "NSGK",
  followthis: "Follow This",
  hospitaalbroeders: "Hospitaalbroeders",
  lezenschrijven: "Lezen & Schrijven",
  takecarebnb: "Takecare BNB",
  sofii: "Sofii",
  newbusiness: "New business",
  eigenbedrijf: "Eigen bedrijf",
  eten: "ETEN",
  prive: "Prive",
  adhd: "ADHD",
  kids: "Kids",
  leren: "Leren",
  financien: "FInancien",
  toekomst: "Toekomst AI en fondsenwerving",
  vakantie: "Vakantie",
  woonboot: "Woonboot",
  amref: "Archief/Amref",
};

const TODO_LINE = /^(\s*)- (?:\[ \] )?#(\w+)\s+(.+)$/;
const INBOX_HEADING = "## 📥 Vanuit dagboekje";
// Sinds 14-10: taken uit "➕ Nieuwe taken" zijn bedoeld voor die dag. Wat niet af is
// gekomen, landt bij de klant onder 🔴 Vandaag (fallback: 📥 als het dashboard geen
// actiesectie heeft).
const VANDAAG = "### 🔴 Vandaag";

function lastNDays(n) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function insertIntoDashboard(folderRelPath, itemText, sourceDateStr) {
  const dashPath = join(PROJECTEN_DIR, folderRelPath, "0 dashboard.md");
  if (!existsSync(dashPath)) {
    console.warn(`⚠️  Dashboard niet gevonden voor route "${folderRelPath}": ${dashPath}`);
    return false;
  }
  let content = readFileSync(dashPath, "utf8");
  const newLine = `- [ ] ${itemText} *(uit dagboekje ${sourceDateStr})*`;

  const lines = content.split("\n");

  const section = findActionsSection(lines);
  if (section) {
    if (findHeaderBlock(lines, section, VANDAAG)) {
      insertTaskUnderHeader(lines, section, VANDAAG, newLine);
    } else {
      lines.splice(section.start + 1, 0, "", VANDAAG, newLine);
    }
    if (!DRY_RUN) writeFileSync(dashPath, lines.join("\n"), "utf8");
    return true;
  }

  const headingIdx = lines.findIndex((l) => l.trim() === INBOX_HEADING);

  if (headingIdx === -1) {
    // Sectie bestaat nog niet: maak 'm aan direct na de eerste H1-regel (en
    // eventuele blockquote-blurb eronder), vóór de rest van het dashboard.
    const h1Idx = lines.findIndex((l) => /^# /.test(l));
    let insertAt = h1Idx === -1 ? 0 : h1Idx + 1;
    // sla lege regels en een eventuele blockquote-blurb (regels die met "> "
    // beginnen) over, in willekeurige afwisseling
    while (
      insertAt < lines.length &&
      (lines[insertAt].trim() === "" || lines[insertAt].startsWith(">"))
    ) {
      insertAt++;
    }
    const block = ["", INBOX_HEADING, "", newLine, ""];
    lines.splice(insertAt, 0, ...block);
  } else {
    // Sectie bestaat al: nieuw item bovenaan de lijst (meest recent eerst),
    // direct na de kopregel.
    let insertAt = headingIdx + 1;
    while (insertAt < lines.length && lines[insertAt].trim() === "") insertAt++;
    lines.splice(insertAt, 0, newLine);
  }

  content = lines.join("\n");
  if (!DRY_RUN) writeFileSync(dashPath, content, "utf8");
  return true;
}

function processDailyNote(dateStr) {
  const notePath = join(CALENDAR_DIR, `${dateStr}.md`);
  if (!existsSync(notePath)) return { found: 0, routed: 0 };

  const original = readFileSync(notePath, "utf8");
  const lines = original.split("\n");
  let found = 0;
  let routed = 0;
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(TODO_LINE);
    if (!m) continue;
    found++;
    const [, indent, tagRaw, text] = m;
    const tag = tagRaw.toLowerCase();
    const folder = TAG_TO_FOLDER[tag];

    if (!folder) {
      console.warn(`⚠️  Onbekende tag "#${tagRaw}" in ${dateStr}.md — regel overgeslagen: "${text}"`);
      continue;
    }

    const ok = insertIntoDashboard(folder, text.trim(), dateStr);
    if (ok) {
      routed++;
      lines[i] = `${indent}- [x] ~~#${tagRaw} ${text.trim()}~~ → verplaatst naar ${folder}-dashboard (🔴 Vandaag)`;
      changed = true;
    }
  }

  if (changed && !DRY_RUN) {
    writeFileSync(notePath, lines.join("\n"), "utf8");
  }
  return { found, routed };
}

let totalFound = 0;
let totalRouted = 0;
for (const dateStr of lastNDays(7)) {
  const { found, routed } = processDailyNote(dateStr);
  totalFound += found;
  totalRouted += routed;
}

console.log(
  `${DRY_RUN ? "[dry-run] " : ""}route-daily-todos: ${totalFound} #tag-taken gezien, ${totalRouted} verplaatst naar dashboards.`
);
