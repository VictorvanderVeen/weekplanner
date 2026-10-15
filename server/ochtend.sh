#!/bin/bash
# Ochtendtaak op de server: vault ophalen via Obsidian Sync, takenlijst bijwerken, terugsturen.
# Vervangt co.veen.chief-morning op de Mac, zodat het werkt terwijl de laptop dicht is.
set -u
export PATH="$HOME/.npm-global/bin:/usr/bin:/bin"
export TZ=Europe/Amsterdam
V="$HOME/vault"
LOG="$HOME/ochtend/ochtend.log"
echo "=== $(date "+%F %T") ===" >> "$LOG"
ob sync --path "$V" >> "$LOG" 2>&1 || { echo "ob sync (ophalen) mislukt" >> "$LOG"; exit 1; }
cd "$HOME/ochtend/weekplanner"
export TODO_ROUTER_VAULT_OVERRIDE="$V" ROLL_BUCKETS_VAULT_OVERRIDE="$V" MORNING_BRIEF_VAULT_OVERRIDE="$V"
node scripts/route-daily-todos.mjs >> "$LOG" 2>&1
node scripts/roll-buckets.mjs >> "$LOG" 2>&1
node scripts/morning-brief.mjs >> "$LOG" 2>&1
ob sync --path "$V" >> "$LOG" 2>&1
