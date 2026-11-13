#!/bin/bash
# Zet de nieuwste versie van de server-scripts op de server (geen wachtwoorden/tokens).
set -e
S=victorvanderveen@85.10.151.75
D="$(cd "$(dirname "$0")" && pwd)"
scp -q "$D/opvolgen.py" "$D/toezeggingen.py" "$S:ochtend/weekplanner/server/"
scp -q "$D/ochtend.sh" "$S:ochtend/ochtend.sh"
ssh "$S" 'chmod +x ~/ochtend/ochtend.sh'
echo "Scripts staan op de server."
