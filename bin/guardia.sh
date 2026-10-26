#!/bin/sh
# Lanza bin/guardia.mjs con el Node que haya (Claude Code no siempre tiene Node en su PATH). Sin Node, deja pasar.
for n in "$(command -v node 2>/dev/null)" "$HOME/.local/node/bin/node" /opt/homebrew/bin/node /usr/local/bin/node; do
  [ -n "$n" ] && [ -x "$n" ] && exec "$n" "$(dirname "$0")/guardia.mjs"
done
exit 0
