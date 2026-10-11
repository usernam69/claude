#!/usr/bin/env bash
# Builds the two cuts of the ad from one template and one score.
#   vertical/   1080x1920 (social)     landscape/  1920x1080
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(dirname "$here")"
cut() { # name width height orient
  local dir="$here/$1"
  mkdir -p "$dir/audio"
  sed -e "s/{{W}}/$2/g" -e "s/{{H}}/$3/g" -e "s/{{ORIENT}}/$4/g" "$here/src/index.template.html" > "$dir/index.html"
  cp "$here/audio/score.wav" "$dir/audio/score.wav"
  "$root/tools/sync-assets.sh" "opus-ad/$1" >/dev/null
  echo "built $1 ($2x$3)"
}
cut vertical 1080 1920 v
cut landscape 1920 1080 h
