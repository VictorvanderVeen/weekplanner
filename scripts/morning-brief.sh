#!/bin/bash
# Shell-wrapper voor LaunchAgent — zorgt voor correcte PATH en working directory.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
# Houd de Mac wakker zolang dit script loopt: op accu valt hij na 1 minuut
# terug in slaap, ook na de geplande wake van 06:50 (pmset repeat).
caffeinate -i -w $$ &
cd "/Users/victorvanderveen/Claude Code/weekplanner"
node scripts/route-daily-todos.mjs >> /tmp/chief-morning.log 2>&1
node scripts/roll-buckets.mjs >> /tmp/chief-morning.log 2>&1
node scripts/morning-brief.mjs >> /tmp/chief-morning.log 2>&1

# Meteen naar GitHub, zodat de dagnotitie op de telefoon staat zonder te
# wachten op de 60-minuten-cyclus van obsidian-git.
cd "/Users/victorvanderveen/Documents/Obsidian Vault"
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "ochtend: dagnotitie $(date '+%Y-%m-%d %H:%M')" >/dev/null
fi
git push origin main >> /tmp/chief-morning.log 2>&1
