#!/bin/bash
# Zet de toezeggingen-stap op de server: Claude Code installeren + abonnements-token opslaan.
set -e
S=victorvanderveen@85.10.151.75
D="$(cd "$(dirname "$0")" && pwd)"
scp -q "$D/opvolgen.py" "$D/toezeggingen.py" "$S:ochtend/weekplanner/server/"
scp -q "$D/ochtend.sh" "$S:ochtend/ochtend.sh"
ssh "$S" 'chmod +x ~/ochtend/ochtend.sh'
echo "Claude Code installeren op de server (duurt even)..."
ssh "$S" 'export PATH="$HOME/.npm-global/bin:$PATH"; npm install -g --prefix "$HOME/.npm-global" @anthropic-ai/claude-code >/dev/null 2>&1 && claude --version'
echo
read -r -s -p "Plak de token uit 'claude setup-token' (je ziet niets verschijnen) en druk Enter: " TK
echo
printf '%s' "$TK" | tr -d '[:space:]' | ssh "$S" 'umask 077; cat > ~/ochtend/.claude-token'
unset TK
echo "Token opgeslagen. Proef: Claude op de server laten antwoorden..."
ssh "$S" 'export PATH="$HOME/.npm-global/bin:$PATH" CLAUDE_CODE_OAUTH_TOKEN="$(cat ~/ochtend/.claude-token)"; echo "Antwoord alleen: OK" | claude -p --max-turns 1'
