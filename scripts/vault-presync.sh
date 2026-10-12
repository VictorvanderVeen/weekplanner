#!/bin/bash
# Zorgt dat de GitHub-kopie van de Obsidian-vault (obsidian-llm-wiki) vers is
# vóórdat de cloud-routine "Dagoverzicht" 'm om 06:00 UTC / ~08:00 NL-tijd
# kloont. Draait onafhankelijk van of Obsidian openstaat (dat pusht zelf pas
# na een volle 60-minuten-cyclus, zie obsidian-git-instellingen).
set -e
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
# Koppen eerst gelijktrekken met de planning, zodat de cloud-routine dezelfde
# "🔴 Vandaag" ziet als de dagnotitie. Een fout hier mag de push niet tegenhouden.
node "/Users/victorvanderveen/Claude Code/weekplanner/scripts/roll-buckets.mjs" >> /tmp/chief-morning.log 2>&1 || true

cd "/Users/victorvanderveen/Documents/Obsidian Vault"

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "pre-sync backup: $(date '+%Y-%m-%d %H:%M:%S')" >/dev/null
fi

git push origin main
