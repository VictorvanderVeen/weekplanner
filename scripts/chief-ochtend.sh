#!/bin/bash
# Shell-wrapper voor LaunchAgent — draaide de volledige /chief-analyse onbemand.
# UITGEZET 14-10-2026 (Victor): faalde steeds (claude-pad, Mac in slaap) en is
# overbodig nu de dagnotitie een live Dataview-lijst van 🔴 Vandaag heeft.
# /chief draai je voortaan met de hand. Weer aanzetten: haal de exit hieronder weg.
exit 0
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
cd "$HOME"
/usr/local/bin/claude -p "/chief" --permission-mode bypassPermissions >> /tmp/chief-ochtend.log 2>&1
