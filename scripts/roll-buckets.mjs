// Roll Buckets — trekt de koppen in de dashboards gelijk met de planning, zodat
// "🔴 Vandaag" de enige plek is waar iets hoeft te kijken om te weten wat er
// vandaag staat. Draait elke ochtend vóór de vault-push (06:45) en vóór
// morning-brief.mjs (07:00), en als stap 0 van /chief. Idempotent.
//
// Drie regels, in deze volgorde:
//   1. Stempelen — een taak in "Deze week"/"Volgende week" zonder [since::]
//      krijgt het stempel van vandaag (anders is niet te zien bij welke week
//      zijn dag-label hoort).
//   2. Week doorschuiven — een taak onder "Volgende week" waarvan het stempel in
//      een eerdere week valt, verhuist naar "Deze week"; het stempel wordt de
//      maandag van de huidige week.
//   3. Naar Vandaag — een taak waarvan de geplande dag (dag-label + stempel) of
//      de deadline vandaag of eerder is, verhuist naar "🔴 Vandaag". Dag-label
//      en stempel vervallen daar, de deadline blijft staan.
//
// Er wordt nooit iets uit "🔴 Vandaag" weggehaald: wat niet af komt blijft staan.
//
// Gebruik:
//   node scripts/roll-buckets.mjs            # voert door
//   node scripts/roll-buckets.mjs --dry-run  # toont alleen wat er zou gebeuren

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  splitLines, joinLines, detectEol, findActionsSection, collectOpenTasks,
  findHeaderBlock, insertTaskUnderHeader, parseDueDate, HEADER_RE,
} from "../../vragenronde/lib/dashboard-parser.mjs";
import { STATUSES, HEADER_BY_STATUS } from "../../vragenronde/lib/canonical-headers.mjs";
import { removeLineAndCleanupHeader } from "../../vragenronde/lib/apply-obsidian-triage.mjs";

const VAULT = process.env.ROLL_BUCKETS_VAULT_OVERRIDE || "/Users/victorvanderveen/Documents/Obsidian Vault";
const DRY_RUN = process.argv.includes("--dry-run");

const VANDAAG = HEADER_BY_STATUS.vandaag;
const DEZE_WEEK = HEADER_BY_STATUS.deze_week;
const VOLGENDE_WEEK = HEADER_BY_STATUS.volgende_week;
const RANK = new Map(STATUSES.map((s, i) => [s.header, i]));

const DAGEN = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const DAG_RE = /\s*\[dag::\s*([^\]]*)\]/;
const SINCE_RE = /\s*\[since::\s*([^\]]*)\]/;

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fromIso(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((s || "").trim());
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}
// 0 = maandag … 6 = zondag
function weekdayIndex(d) {
  return (d.getDay() + 6) % 7;
}
function mondayOf(d) {
  return addDays(d, -weekdayIndex(d));
}

const today = fromIso(process.env.ROLL_BUCKETS_TODAY_OVERRIDE) || new Date(new Date().setHours(0, 0, 0, 0));
const todayIso = iso(today);
const thisMonday = mondayOf(today);

function getDag(line) {
  const m = line.match(DAG_RE);
  if (!m) return -1;
  return DAGEN.indexOf(m[1].trim().toLowerCase());
}
function getSince(line) {
  const m = line.match(SINCE_RE);
  return m ? fromIso(m[1]) : null;
}
function stripTag(line, re) {
  return line.replace(new RegExp(re.source, "g"), "").replace(/\s+$/, "");
}
function setSince(line, date) {
  return `${stripTag(line, SINCE_RE)} [since:: ${iso(date)}]`;
}

// De datum waar een dag-label naar verwijst. Onder "Deze week" is dat de eerste
// keer dat die weekdag voorkomt op of na het stempel (een taak die op woensdag
// "Dinsdag" krijgt, bedoelt de dinsdag erna); onder "Volgende week" de weekdag
// in de week ná die van het stempel.
function plannedDate(header, line) {
  const dag = getDag(line);
  const since = getSince(line);
  if (dag === -1 || !since) return null;
  if (header === VOLGENDE_WEEK) return addDays(mondayOf(since), 7 + dag);
  if (header === DEZE_WEEK) return addDays(since, (dag - weekdayIndex(since) + 7) % 7);
  return null;
}

// Zelfde als insertTaskUnderHeader, maar een nog niet bestaande kop komt op zijn
// canonieke plek (Vandaag boven Deze week boven Volgende week …) in plaats van
// onderaan de sectie.
function insertInOrder(lines, headerText, newLine) {
  const section = findActionsSection(lines);
  if (findHeaderBlock(lines, section, headerText)) {
    insertTaskUnderHeader(lines, section, headerText, newLine);
    return;
  }
  const rank = RANK.get(headerText);
  for (let i = section.start + 1; i < section.end; i++) {
    if (!HEADER_RE.test(lines[i])) continue;
    const other = RANK.has(lines[i].trim()) ? RANK.get(lines[i].trim()) : Infinity;
    if (other > rank) {
      lines.splice(i, 0, headerText, newLine, "");
      return;
    }
  }
  insertTaskUnderHeader(lines, section, headerText, newLine);
}

function decide(header, line) {
  const inWeek = header === DEZE_WEEK || header === VOLGENDE_WEEK;
  if (header !== VANDAAG) {
    const due = parseDueDate(line);
    const planned = plannedDate(header, line);
    if ((due && due <= todayIso) || (planned && iso(planned) <= todayIso)) {
      return { to: VANDAAG, line: stripTag(stripTag(line, DAG_RE), SINCE_RE), why: due && due <= todayIso ? `deadline ${due}` : `gepland ${iso(planned)}` };
    }
  }
  if (!inWeek) return null;
  const since = getSince(line);
  if (!since) return { to: header, line: setSince(line, today), why: "stempel gezet" };
  if (header === VOLGENDE_WEEK && iso(mondayOf(since)) < iso(thisMonday)) {
    return { to: DEZE_WEEK, line: setSince(line, thisMonday), why: "nieuwe week" };
  }
  return null;
}

function processDashboard(file, client) {
  const raw = readFileSync(file, "utf8");
  const eol = detectEol(raw);
  const lines = splitLines(raw);
  const section = findActionsSection(lines);
  if (!section) return [];

  const log = [];
  // Eerst alle besluiten nemen op de ongewijzigde stand, dan pas verplaatsen —
  // elke verplaatsing zoekt zijn regel opnieuw op, want de indexen schuiven.
  const moves = collectOpenTasks(lines, section)
    .map((t) => ({ ...t, decision: decide(t.header, t.rawLine) }))
    .filter((t) => t.decision);

  for (const { header, rawLine, decision } of moves) {
    const sec = findActionsSection(lines);
    let idx = -1;
    for (let i = sec.start + 1; i < sec.end; i++) {
      if (lines[i] === rawLine) { idx = i; break; }
    }
    if (idx === -1) continue;
    if (decision.to === header) {
      lines[idx] = decision.line;
    } else {
      removeLineAndCleanupHeader(lines, header, idx);
      insertInOrder(lines, decision.to, decision.line);
    }
    const from = (header || "(geen kop)").replace(/^### /, "");
    const to = decision.to.replace(/^### /, "");
    log.push(`${client}: ${from === to ? from : `${from} → ${to}`} (${decision.why}) — ${rawLine.replace(/^- \[ \] /, "").slice(0, 70)}`);
  }

  if (log.length && !DRY_RUN) writeFileSync(file, joinLines(lines, eol), "utf8");
  return log;
}

const projecten = path.join(VAULT, "Projecten");
const log = [];
for (const dir of readdirSync(projecten, { withFileTypes: true }).filter((d) => d.isDirectory())) {
  const file = path.join(projecten, dir.name, "0 dashboard.md");
  if (existsSync(file)) log.push(...processDashboard(file, dir.name));
}
log.forEach((l) => console.log(`  ${l}`));
console.log(`${DRY_RUN ? "[dry-run] " : ""}roll-buckets ${todayIso}: ${log.length} taken bijgewerkt.`);
