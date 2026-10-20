#!/bin/sh

set -eu

# Make common Homebrew installations visible when the script is launched from
# a minimal shell. Other platforms continue to use their existing PATH.
PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
export PATH

site_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)
cd "$site_dir"

# Keep Wrangler's local logs and Miniflare registry inside this project. This
# matches the normal launcher and avoids depending on a writable home folder.
WRANGLER_WRITE_LOGS='false'
WRANGLER_LOG_PATH="$site_dir/.wrangler/logs"
MINIFLARE_REGISTRY_PATH="$site_dir/.wrangler/registry"
export WRANGLER_WRITE_LOGS WRANGLER_LOG_PATH MINIFLARE_REGISTRY_PATH

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' 'Node.js was not found. Install Node.js 22.13 or newer, then run ./install.sh again.' >&2
  exit 1
fi

if ! node -e 'const [major,minor]=process.versions.node.split(".").map(Number);process.exit(major>22||(major===22&&minor>=13)?0:1)'; then
  printf 'Node.js 22.13 or newer is required. Found %s.\n' "$(node --version)" >&2
  exit 1
fi

pnpm_version='11.19.0'

run_pnpm() {
  if command -v pnpm >/dev/null 2>&1 && [ "$(pnpm --version)" = "$pnpm_version" ]; then
    pnpm "$@"
    return
  fi
  if ! command -v npm >/dev/null 2>&1; then
    printf 'pnpm %s is unavailable and npm was not found to run the pinned installer.\n' "$pnpm_version" >&2
    exit 1
  fi
  npm exec --yes --package="pnpm@$pnpm_version" -- pnpm "$@"
}

printf '%s\n' 'Installing locked website dependencies…'
run_pnpm install --frozen-lockfile

printf '%s\n' 'Preparing local settings without replacing existing configuration…'
node scripts/setup-local.mjs

printf '%s\n' 'Applying local database migrations…'
node node_modules/wrangler/bin/wrangler.js d1 migrations apply DB --local --config wrangler.local.jsonc

printf '\n%s\n' 'Installation complete. Start the website with ./run.sh'
