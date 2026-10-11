#!/usr/bin/env bash
# Builds the vertical (root) and landscape cuts from template.html + ad.js
set -e
cd "$(dirname "$0")"
mk() { sed -e "s/__W__/$2/g; s/__H__/$3/g; s/__A__/$4/g; s/__B__/$5/g; s/__CF__/$6/g; s/__CM__/$7/g; s/__CP__/$8/g; s/__CW__/$9/g; s/__CG__/${10}/g" src/template.html > "$1/index.html"; }
mk . 1080 1920 250 150 46 70 "26px 54px" 12 26
mkdir -p landscape/assets landscape/audio
cp -r assets/. landscape/assets/; cp ad.js landscape/; cp hyperframes.json meta.json package.json landscape/ 2>/dev/null || true
[ -f audio/score.wav ] && cp audio/score.wav landscape/audio/
mk landscape 1920 1080 230 140 44 56 "24px 52px" 11 24
