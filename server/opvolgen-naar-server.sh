#!/bin/bash
# Zet de opvolg-mails-stap op de server en vraagt om het Soverin-app-wachtwoord.
set -e
S=victorvanderveen@85.10.151.75
D="$(cd "$(dirname "$0")" && pwd)"
ssh "$S" 'mkdir -p ~/ochtend/weekplanner/server'
scp -q "$D/opvolgen.py" "$S:ochtend/weekplanner/server/opvolgen.py"
scp -q "$D/ochtend.sh" "$S:ochtend/ochtend.sh"
ssh "$S" 'chmod +x ~/ochtend/ochtend.sh'
echo "Bestanden staan erop."
echo
read -r -s -p "Plak het Soverin-app-wachtwoord (je ziet niets verschijnen) en druk Enter: " PW
echo
printf 'victor@veen.co\n%s\n' "$PW" | ssh "$S" 'umask 077; cat > ~/ochtend/.soverin'
unset PW
echo "Wachtwoord opgeslagen. Proef-run:"
ssh "$S" 'OPVOLGEN_VAULT=~/vault python3 - <<"EOF"
import sys; sys.path.insert(0, "/home/victorvanderveen/ochtend/weekplanner/server")
import opvolgen as o
m = o.haal_mails(); v = o.verwerkt_ids()
print(f"Gelukt: {len(m)} mails in _opvolgen, {len([x for x in m if x[\"id\"] not in v])} nieuw.")
EOF'
