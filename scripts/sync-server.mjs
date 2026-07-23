// Lokale ontvanger voor de "→ Obsidian"-knop in Weekplanner.
//
// De browser haalt de openstaande taken zelf op via de ingelogde
// Supabase-sessie (RLS beperkt dat al tot de eigen rijen) en stuurt ze
// hierheen — dit script heeft dus zelf GEEN Supabase-sleutel nodig, alleen
// schrijftoegang tot de vault.
//
// Gebruik: node scripts/sync-server.mjs
// (localhost wordt door browsers als secure context behandeld, dus dit werkt
// ook vanuit de https-deployment op Vercel — zolang dit script op dezelfde
// Mac draait als de Obsidian-vault.)

import { createServer } from "node:http";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnv(p = ".env.local") {
  let raw;
  try {
    raw = readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
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

const env = { ...loadEnv(), ...process.env };
const VAULT_PATH = env.OBSIDIAN_VAULT_PATH || "/Users/victorvanderveen/Documents/Obsidian Vault";
const PROJECTEN_DIR = path.join(VAULT_PATH, "Projecten");
const PORT = Number(env.SYNC_SERVER_PORT || 5760);

const MARK_START = "<!-- weekplanner:start -->";
const MARK_END = "<!-- weekplanner:end -->";

function normalize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findClientFolder(clientName) {
  if (!existsSync(PROJECTEN_DIR)) return null;
  const target = normalize(clientName);
  const dirs = readdirSync(PROJECTEN_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());
  const exact = dirs.find((d) => normalize(d.name) === target);
  return exact ? exact.name : null;
}

function formatTaskLine(t) {
  const bits = [];
  if (t.hours) bits.push(`${t.hours}u`);
  if (t.priority === "high") bits.push("hoog");
  if (t.priority === "low") bits.push("laag");
  if (t.day) bits.push(t.day);
  const suffix = bits.length ? ` — ${bits.join(", ")}` : "";
  let block = `- [ ] ${t.task}${suffix}\n`;
  for (const s of t.subtasks || []) {
    block += `    - [${s.done ? "x" : " "}] ${s.text}\n`;
  }
  return block;
}

function buildBlock(tasks) {
  const stamp = new Date().toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
  let body = `${MARK_START}\n## Weekplanner (gesynct ${stamp})\n`;
  body += tasks.length
    ? tasks.map(formatTaskLine).join("")
    : "*Geen openstaande taken.*\n";
  body += `${MARK_END}\n`;
  return body;
}

function writeBlockToCockpit(folderName, block) {
  const file = path.join(PROJECTEN_DIR, folderName, "0 cockpit.md");
  if (!existsSync(file)) return { ok: false, reason: "geen 0 cockpit.md gevonden" };

  let content = readFileSync(file, "utf8");
  const markerRe = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}\\n?`);

  if (markerRe.test(content)) {
    content = content.replace(markerRe, block);
  } else {
    const fmMatch = content.match(/^---\n[\s\S]*?\n---\n/);
    const insertAt = fmMatch ? fmMatch[0].length : 0;
    content = content.slice(0, insertAt) + "\n" + block + "\n" + content.slice(insertAt);
  }

  writeFileSync(file, content, "utf8");
  return { ok: true };
}

function setCors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const server = createServer((req, res) => {
  setCors(res, req.headers.origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/sync") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "ongeldige JSON" }));
        return;
      }

      const tasks = Array.isArray(payload.tasks) ? payload.tasks : [];
      const clientNames = Array.isArray(payload.clientNames) ? payload.clientNames : [];

      // Elke bekende klant krijgt een entry, ook als er 0 open taken zijn —
      // anders blijft een verouderd blok met afgeronde taken staan.
      const byClient = new Map();
      for (const naam of clientNames) byClient.set(naam, []);
      for (const t of tasks) {
        const key = t.client || "Overig";
        if (!byClient.has(key)) byClient.set(key, []);
        byClient.get(key).push(t);
      }

      const updated = [];
      const unmatched = [];
      for (const [client, clientTasks] of byClient) {
        const folder = findClientFolder(client);
        if (!folder) {
          unmatched.push(client);
          continue;
        }
        const result = writeBlockToCockpit(folder, buildBlock(clientTasks));
        if (result.ok) updated.push(`${client} (${clientTasks.length})`);
        else unmatched.push(`${client} — ${result.reason}`);
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ updated, unmatched }));
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Weekplanner → Obsidian sync-server draait op http://localhost:${PORT}`);
  console.log(`Vault: ${VAULT_PATH}`);
});
