#!/bin/bash
# Zet de Claude-token (abonnement) op de server. Leest van het klembord, zodat de
# token nooit in Terminal geplakt hoeft te worden.
set -e
S=victorvanderveen@85.10.151.75
echo "1. Draai in een ANDER Terminal-venster:  ~/.local/bin/claude setup-token"
echo "2. Kopieer de token die je krijgt (Cmd+C)."
read -r -p "3. Kom hier terug en druk op Enter... " _
TK="$(pbpaste | tr -d '[:space:]')"
case "$TK" in
  sk-ant-oat01-*) ;;
  *) echo "Op je klembord staat geen token (die begint met sk-ant-oat01-). Opnieuw proberen."; exit 1 ;;
esac
printf '%s' "$TK" | ssh "$S" 'umask 077; cat > ~/ochtend/.claude-token'
unset TK
printf '' | pbcopy  # klembord leegmaken
echo "Token opgeslagen. Proef:"
ssh "$S" 'export PATH="$HOME/.npm-global/bin:$PATH" CLAUDE_CODE_OAUTH_TOKEN="$(cat ~/ochtend/.claude-token)"; echo "Antwoord alleen: OK" | claude -p --max-turns 1'
