#!/usr/bin/env python3
"""Opvolg-mails in de dagnotitie.

Leest de Soverin-map INBOX/_opvolgen rechtstreeks via IMAP (alleen lezen, niets
markeren of verplaatsen) en zet onder "## 📌 Opvolgen" in de dagnotitie één regel
per mail die nog niet tot taak is gemaakt. Welke mails al verwerkt zijn, staat in
de vault in `Systeem info/opvolgen-verwerkt.md` (bijgehouden door /chief).

Inloggegevens: ~/ochtend/.soverin (regel 1 = gebruiker, regel 2 = app-wachtwoord).
Vault-pad: OPVOLGEN_VAULT (standaard ~/vault).
"""
import email
import email.header
import email.utils
import imaplib
import os
import re
import sys
from datetime import date, datetime

HOST = "imap.soverin.net"
MAP = "INBOX/_opvolgen"
HEADING = "## 📌 Opvolgen"
BEFORE = "## 🔭 Overzicht"  # nieuwe sectie komt vóór deze kop
VAULT = os.environ.get("OPVOLGEN_VAULT", os.path.expanduser("~/vault"))
CRED = os.path.expanduser("~/ochtend/.soverin")
MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"]


def dec(value):
    if not value:
        return ""
    parts = []
    for text, enc in email.header.decode_header(value):
        if isinstance(text, bytes):
            text = text.decode(enc or "utf-8", errors="replace")
        parts.append(text)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def verwerkt_ids():
    pad = os.path.join(VAULT, "Systeem info", "opvolgen-verwerkt.md")
    try:
        with open(pad, encoding="utf-8") as f:
            return {m.strip() for m in re.findall(r"^- `([^`]+)`", f.read(), re.M)}
    except FileNotFoundError:
        return set()


def haal_mails():
    with open(CRED, encoding="utf-8") as f:
        user, wachtwoord = [r.strip() for r in f.read().splitlines()[:2]]
    imap = imaplib.IMAP4_SSL(HOST, 993)
    imap.login(user, wachtwoord)
    try:
        status, _ = imap.select(f'"{MAP}"', readonly=True)
        if status != "OK":
            raise RuntimeError(f"map {MAP} niet gevonden")
        _, data = imap.search(None, "ALL")
        nummers = data[0].split()
        mails = []
        if nummers:
            _, rows = imap.fetch(b",".join(nummers),
                                 "(BODY.PEEK[HEADER.FIELDS (MESSAGE-ID FROM SUBJECT DATE)])")
            for row in rows:
                if not isinstance(row, tuple):
                    continue
                m = email.message_from_bytes(row[1])
                naam, adres = email.utils.parseaddr(dec(m.get("From")))
                try:
                    dt = email.utils.parsedate_to_datetime(m.get("Date"))
                except Exception:
                    dt = None
                mails.append({
                    "id": (m.get("Message-ID") or "").strip().strip("<>"),
                    "van": naam or adres,
                    "onderwerp": dec(m.get("Subject")) or "(geen onderwerp)",
                    "datum": dt,
                })
        return mails
    finally:
        imap.logout()


def regels(mails, verwerkt):
    nieuw = [m for m in mails if m["id"] not in verwerkt]
    nieuw.sort(key=lambda m: m["datum"].timestamp() if m["datum"] else 0)
    oud = len(mails) - len(nieuw)
    out = []
    if not nieuw:
        out.append("*Geen nieuwe opvolg-mails.*")
    for m in nieuw:
        d = m["datum"]
        datum = f"{d.day} {MAANDEN[d.month - 1]}" if d else "?"
        onderwerp = m["onderwerp"].replace("[", "(").replace("]", ")")
        out.append(f"- **{onderwerp}** — {m['van']}, {datum}")
    if oud:
        out.append(f"\n*+{oud} al ingepland als taak. Nieuwe omzetten? Draai `/chief` op de Mac.*")
    elif nieuw:
        out.append("\n*Omzetten in taken? Draai `/chief` op de Mac.*")
    return out


def zet_sectie(inhoud, body):
    lines = inhoud.split("\n")
    blok = [HEADING, "", *body, ""]
    if HEADING in [l.strip() for l in lines]:
        i = [l.strip() for l in lines].index(HEADING)
        eind = next((j for j in range(i + 1, len(lines)) if lines[j].startswith("## ")), len(lines))
        lines[i:eind] = blok
    else:
        stripped = [l.strip() for l in lines]
        at = stripped.index(BEFORE) if BEFORE in stripped else len(lines)
        lines[at:at] = blok
    return "\n".join(lines)


def main():
    pad = os.path.join(VAULT, "Calendar", f"{date.today().isoformat()}.md")
    if not os.path.exists(pad):
        print(f"opvolgen: dagnotitie {pad} bestaat niet, overgeslagen")
        return 0
    try:
        body = regels(haal_mails(), verwerkt_ids())
    except Exception as e:  # nooit de ochtendrun breken
        print(f"opvolgen: mislukt: {e}")
        body = [f"*✉️ Map `_opvolgen` niet gecheckt ({type(e).__name__}).*"]
    with open(pad, encoding="utf-8") as f:
        inhoud = f.read()
    with open(pad, "w", encoding="utf-8") as f:
        f.write(zet_sectie(inhoud, body))
    print(f"opvolgen: {datetime.now():%H:%M} sectie bijgewerkt ({len(body)} regels)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
