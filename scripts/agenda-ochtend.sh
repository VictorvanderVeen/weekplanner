#!/bin/bash
# Shell-wrapper voor LaunchAgent co.veen.agenda-ochtend (werkdagen 06:52, net na
# de geplande wake van 06:50). Houdt de Mac wakker zolang we wachten op de
# dagnotitie van de server + de trage Calendar.app-query.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
caffeinate -i -w $$ &
cd "/Users/victorvanderveen/Claude Code/weekplanner"
node scripts/agenda-ochtend.mjs >> /tmp/agenda-ochtend.log 2>&1
