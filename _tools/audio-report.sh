#!/usr/bin/env bash
# Loudness / peak report for a WAV: integrated LUFS, true peak, LRA, plus clipped-sample count.
f="$1"
ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I:|LRA:|Peak:)" | sed 's/^ */  /'
ffmpeg -hide_banner -nostats -i "$f" -af astats=measure_overall=Peak_level:measure_perchannel=none -f null - 2>&1 | grep -E "Peak level" | sed 's/.*\] /  /'
