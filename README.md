# Deepfake Detection Lab — workshop edition

A browser-based workshop with ten image and video cases, manual inspection tools, saved detector results, and a separate watermark demonstration. Detector scores are cached, model-specific outputs—not probabilities or a verdict. No detector models run on this website.

## Branches

- **`hands-on-session-use` (this branch):** interactive workshop. Participants enter a nickname and shared passcode, save answers, and submit a final result. The instructor starts the tracker and later reveals results.
- **`main`:** post-event review. Visitors can reveal documented answers, view the final scoreboard, and download the presentation. New quiz submissions are disabled. It has a different, passcode-only landing page.

## Run locally

Requires Node.js 22.13 or newer and `zsh` (the launcher is designed for macOS). From this folder:

```sh
./install.sh
./run.sh
```

Open `http://localhost:3001/`; instructor controls are at `/admin`. Keep the terminal open while using the site and press Ctrl+C to stop it. The launcher shares the site on your local network by default; use `./run.sh --local-only` to restrict access to this computer, or `./run.sh --no-open` to prevent it from opening a browser.

Fresh local setup uses `interpol2026` for both the workshop passcode and instructor key. **These are public demonstration defaults, not secure deployment credentials.** Before sharing a server, set separate private values in the ignored `.dev.vars` file (or Docker secret files). Existing local settings are not overwritten by `./install.sh`.

For a single-server Docker deployment, see [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md).

## Data and reuse

The site stores participant answers and tracker state in a local database; it is not a static HTML export. This repository includes selected media, cached evidence, and the instruction manual, but no event responses, live secrets, model weights, or detector runtimes. See [THIRD_PARTY_MEDIA.md](THIRD_PARTY_MEDIA.md) and Admin → Credits for asset sources and reuse terms. Public source availability does not grant a blanket licence to the code or media.
