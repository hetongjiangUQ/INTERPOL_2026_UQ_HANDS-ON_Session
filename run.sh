#!/bin/zsh

# Finder and non-interactive shells can have a smaller PATH than a normal
# terminal. Keep the common Homebrew locations available before locating Node.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

site_dir="${0:A:h}"
cd "$site_dir" || exit 1

if ! command -v node >/dev/null 2>&1; then
  print -u2 'Node.js was not found. Install Node.js 22.13 or newer, then run this script again.'
  exit 1
fi

exec node scripts/start-local.mjs "$@"
