#!/bin/bash
# Shell-wrapper voor LaunchAgent — zorgt voor correcte PATH en working directory.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
cd "/Users/victorvanderveen/Claude Code/weekplanner"
node scripts/route-daily-todos.mjs >> /tmp/chief-morning.log 2>&1
node scripts/roll-buckets.mjs >> /tmp/chief-morning.log 2>&1
node scripts/morning-brief.mjs >> /tmp/chief-morning.log 2>&1
