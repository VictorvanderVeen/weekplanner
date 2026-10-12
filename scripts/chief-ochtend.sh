#!/bin/bash
# Shell-wrapper voor LaunchAgent — draait de volledige /chief-analyse onbemand.
# Loopt na morning-brief.sh (08:00) zodat de dagnotitie al bestaat.
export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"
cd "$HOME"
/usr/local/bin/claude -p "/chief" --permission-mode bypassPermissions >> /tmp/chief-ochtend.log 2>&1
