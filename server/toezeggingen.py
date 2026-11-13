#!/usr/bin/env python3
"""Toezeggingen uit verzonden mail in de dagnotitie.

Leest via IMAP (alleen lezen) de map Sent bij Soverin, laat Claude Code (`claude -p`,
abonnement via CLAUDE_CODE_OAUTH_TOKEN) de beloftes eruit halen en zet ze als
VOORSTEL onder "## ✉️ Toezeggingen" in de dagnotitie. Niets gaat zelf naar een
dashboard: Victor keurt goed via /chief op de Mac, die de message-id dan in
`Systeem info/toezeggingen-verwerkt.md` zet. Onbeantwoorde voorstellen blijven
14 dagen terugkomen.

Status (wat al bekeken is + openstaande voorstellen): ~/ochtend/toezeggingen.json
"""
import email
import email.utils
import imaplib
import json
import os
import re
import subprocess
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import opvolgen as ov  # dec(), zet_sectie(), CRED, HOST, VAULT, MAANDEN

HEADING = "## ✉️ Toezeggingen"
STATE = os.path.expanduser("~/ochtend/toezeggingen.json")
EERSTE_KEER_DAGEN = 10
VOORSTEL_DAGEN = 14
SEEN_DAGEN = 30
OVERSLAAN = {"Drafts", "Trash", "Spam", "Blocked", "Notes", "INBOX/Ads", "INBOX/AI"}
KLANTTAGS = ("#mindwise #nsgk #uaf #takecarebnb #lezenschrijven #sofii #radboud "
             "#newbusiness #eigenbedrijf #prive")

PROMPT = """Je bent de assistent van Victor van der Veen (strateeg/accountmanager bij bureau
Mindwise, fondsenwerving-klanten). Hieronder staan mails die Victor zelf heeft VERSTUURD.
Zoek concrete toezeggingen: dingen die Victor belooft te doen of te leveren voor een ander
("ik stuur je vrijdag…", "ik kijk ernaar en kom erop terug", "maak ik morgen aan").
NIET: wat anderen moeten doen, beleefdheidsfrasen zonder concrete actie, dingen die in
dezelfde mail al geleverd worden (bijlage zit erbij), privé-afspraken zonder actie.

Vandaag is {vandaag}. Klanttags: {tags} (Het Gehandicapte Kind = #nsgk, Stichting
Vluchteling-Studenten UAF = #uaf, Lezen & Schrijven = #lezenschrijven). Geen passende klant → "".

Gebruik geen tools; alles staat hieronder. Antwoord met ALLEEN een JSON-array, niets anders. Per toezegging:
{{"id": "<message-id precies zoals gegeven>", "klant": "#tag of leeg", "taak": "korte taak,
begint met werkwoord", "aan": "voornaam ontvanger", "due": "YYYY-MM-DD of null",
"bucket": "Vandaag | Deze week | Volgende week"}}
Bucket: deadline vandaag/morgen → Vandaag; binnen 7 dagen of geen termijn → Deze week;
later → Volgende week. Geen toezeggingen → [].

MAILS:
{mails}"""


def lees_state():
    try:
        with open(STATE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"lastRun": None, "seen": {}, "pending": {}}


def verwerkt_ids():
    pad = os.path.join(ov.VAULT, "Systeem info", "toezeggingen-verwerkt.md")
    try:
        with open(pad, encoding="utf-8") as f:
            return {m.strip() for m in re.findall(r"^- `([^`]+)`", f.read(), re.M)}
    except FileNotFoundError:
        return set()


def tekst_van(msg):
    deel = None
    for p in msg.walk():
        if p.get_content_type() == "text/plain" and "attachment" not in str(p.get("Content-Disposition")):
            deel = p
            break
    if deel is None:
        for p in msg.walk():
            if p.get_content_type() == "text/html":
                deel = p
                break
    if deel is None:
        return ""
    raw = deel.get_payload(decode=True) or b""
    t = raw.decode(deel.get_content_charset() or "utf-8", errors="replace")
    if deel.get_content_type() == "text/html":
        t = re.sub(r"<(br|/p|/div)[^>]*>", "\n", t, flags=re.I)
        t = re.sub(r"<[^>]+>", "", t)
    uit = []
    for regel in t.splitlines():
        if re.match(r"^\s*(Op .{5,120}(schreef|wrote)|On .{5,120}wrote|-{3,}\s*(Original|Oorspronkelijk|Forwarded|Doorgestuurd)|Van:\s|From:\s)", regel):
            break
        if regel.lstrip().startswith(">"):
            continue
        uit.append(regel.rstrip())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(uit)).strip()[:3000]


def haal_verzonden(sinds):
    with open(ov.CRED, encoding="utf-8") as f:
        user, wachtwoord = [r.strip() for r in f.read().splitlines()[:2]]
    imap = imaplib.IMAP4_SSL(ov.HOST, 993)
    imap.login(user, wachtwoord)
    try:
        # Sinds 31-10 staan antwoorden in de map van het oorspronkelijke bericht, niet in
        # Sent: dus alle mappen doorzoeken op mails ván Victor.
        _, lijst = imap.list()
        mappen = []
        for regel in lijst:
            regel = regel.decode(errors="replace")
            if "\\Noselect" in regel:
                continue
            naam = re.search(r'"?([^"]+)"?$', regel.split(' "/" ', 1)[-1]).group(1)
            if naam in OVERSLAAN or naam.startswith("ZZ_Archief"):
                continue
            mappen.append(naam)
        mails, gezien = [], set()
        for map_ in mappen:
            if imap.select(f'"{map_}"', readonly=True)[0] != "OK":
                continue
            _, data = imap.search(None, "FROM", f'"{user}"', "SINCE", sinds.strftime("%d-%b-%Y"))
            for n in data[0].split():
                _, rows = imap.fetch(n, "(BODY.PEEK[])")
                m = email.message_from_bytes(rows[0][1])
                mid = (m.get("Message-ID") or "").strip().strip("<>")
                aan = ov.dec(m.get("To"))
                if (not mid or mid in gezien or ov.dec(m.get("Subject")).startswith("Reminder: event")
                        or (user.lower() in aan.lower() and "," not in aan)):  # aan zichzelf
                    continue
                gezien.add(mid)
                mails.append({
                    "id": mid,
                    "aan": aan,
                    "onderwerp": ov.dec(m.get("Subject")),
                    "datum": m.get("Date"),
                    "tekst": tekst_van(m),
                })
        return mails
    finally:
        imap.logout()


def vraag_claude(mails):
    blok = "\n\n".join(
        f"=== message-id: {m['id']}\nAan: {m['aan']}\nDatum: {m['datum']}\nOnderwerp: {m['onderwerp']}\n\n{m['tekst']}"
        for m in mails)
    prompt = PROMPT.format(vandaag=date.today().isoformat(), tags=KLANTTAGS, mails=blok)
    r = subprocess.run(["claude", "-p", "--max-turns", "1", "--tools", ""], input=prompt, capture_output=True,
                       text=True, timeout=600)
    if r.returncode != 0:
        raise RuntimeError(f"claude faalde: {r.stderr.strip()[:200] or r.stdout.strip()[:200]}")
    m = re.search(r"\[.*\]", r.stdout, re.S)
    if not m:
        raise RuntimeError(f"geen JSON van claude: {r.stdout.strip()[:200]}")
    return json.loads(m.group(0))


def opmaak(v):
    d = date.fromisoformat(v["mail_datum"])
    klant = v.get("klant") or "geen klant"
    due = f", [due:: {v['due']}]" if v.get("due") else ""
    return (f"- {klant} — {v['taak']} (mail aan {v.get('aan') or '?'}, {d.day} {ov.MAANDEN[d.month - 1]})"
            f" — voorstel: {v.get('bucket') or 'Deze week'}{due}")


def main():
    pad = os.path.join(ov.VAULT, "Calendar", f"{date.today().isoformat()}.md")
    if not os.path.exists(pad):
        print(f"toezeggingen: dagnotitie {pad} bestaat niet, overgeslagen")
        return 0
    state = lees_state()
    verwerkt = verwerkt_ids()
    vandaag = date.today()
    fout = None
    try:
        sinds = (date.fromisoformat(state["lastRun"]) - timedelta(days=1)) if state.get("lastRun") \
            else vandaag - timedelta(days=EERSTE_KEER_DAGEN)
        nieuw = [m for m in haal_verzonden(sinds)
                 if m["id"] and m["id"] not in state["seen"] and m["id"] not in verwerkt and m["tekst"]]
        if nieuw:
            datums = {m["id"]: m["datum"] for m in nieuw}
            for i in range(0, len(nieuw), 15):  # in porties, houdt de prompt klein
                portie = nieuw[i:i + 15]
                gevonden = {}
                for v in vraag_claude(portie):
                    if v.get("id") not in datums:
                        continue
                    try:
                        md = email.utils.parsedate_to_datetime(datums[v["id"]]).date()
                    except Exception:
                        md = vandaag
                    v["mail_datum"] = md.isoformat()
                    gevonden.setdefault(v["id"], []).append(v)
                state["pending"].update(gevonden)  # pas na geslaagde portie: geen dubbelen
                for m in portie:
                    state["seen"][m["id"]] = vandaag.isoformat()
        state["lastRun"] = vandaag.isoformat()
    except Exception as e:  # nooit de ochtendrun breken
        fout = e
        print(f"toezeggingen: mislukt: {e}")

    grens_v = (vandaag - timedelta(days=VOORSTEL_DAGEN)).isoformat()
    grens_s = (vandaag - timedelta(days=SEEN_DAGEN)).isoformat()
    state["pending"] = {k: [v for v in vs if v["mail_datum"] >= grens_v]
                        for k, vs in state["pending"].items() if k not in verwerkt}
    state["pending"] = {k: vs for k, vs in state["pending"].items() if vs}
    state["seen"] = {k: d for k, d in state["seen"].items() if d >= grens_s}
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=1)

    voorstellen = sorted((v for vs in state["pending"].values() for v in vs), key=lambda v: v["mail_datum"])
    body = [opmaak(v) for v in voorstellen] or ["*Geen openstaande toezeggingen gevonden.*"]
    if fout:
        body.append(f"\n*✉️ Verzonden mail vandaag niet gecheckt ({type(fout).__name__}).*")
    if voorstellen:
        body.append("\n*Inplannen? Draai `/chief` op de Mac, of zet een regel zelf als `- [ ] #klant taak` onder ➕ Nieuwe taken.*")
    with open(pad, encoding="utf-8") as f:
        inhoud = f.read()
    with open(pad, "w", encoding="utf-8") as f:
        f.write(ov.zet_sectie(inhoud, body, HEADING))
    print(f"toezeggingen: {datetime.now():%H:%M} {len(voorstellen)} voorstel(len) in dagnotitie")
    return 0


if __name__ == "__main__":
    sys.exit(main())
