#!/usr/bin/env bash
# Copies the shared runtime files into a project's assets/ folder so each
# composition renders from its own directory (no network needed).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="$(dirname "$here")"
for proj in "$@"; do
  dest="$root/$proj/assets"
  mkdir -p "$dest"
  cp "$here/lib/motion.js" "$dest/motion.js"
  cp "$here/node_modules/gsap/dist/gsap.min.js" "$dest/gsap.min.js"
  cp "$here/node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2" "$dest/InstrumentSerif-Regular.woff2"
  cp "$here/node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2" "$dest/InstrumentSerif-Italic.woff2"
  cp "$here/node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2" "$dest/Inter-400.woff2"
  cp "$here/node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2" "$dest/Inter-500.woff2"
  echo "synced $proj/assets"
done
