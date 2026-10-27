# deepfake_detection_training

A compact local workshop website for comparing cached deepfake-detector evidence. The distributable default contains seven image cases, three video cases, and a separate optional image-watermarking playground.

This is the website-only checkout, but not a pure static-HTML export: instructor controls, reveal state, and audience responses use a local Worker and D1 database. No audio file is included because audio is not part of the current session.

No detector model, checkpoint, Python environment, or live inference service is included. The displayed detector outputs were precomputed for the exact bundled files and are checked against their SHA-256 hashes. They are uncalibrated model outputs, not probabilities or a combined truth score.

The participant entry screen accepts only the shared passcode before displaying the landing page at `/`, the hands-on Detection lab at `/hands-on`, or the slides page at `/slides`. A temporary anonymous visitor label is generated internally to retain the existing session database structure. The current local participant passcode is `interpol2026`. The slides download uses an authenticated endpoint and a private local R2 object seeded at startup from a byte-identical copy of the presenter-supplied `UQ_Deepfake_Slide.pptx` (SHA-256 `c55760d9060fab08dbb4357ad0e67d306a932a4632b28a962ba13b05436d4c2a`). The website also contains a Watermark lab and the audience tracker at `/admin`. Current asset sources and reuse terms are in [`THIRD_PARTY_MEDIA.md`](THIRD_PARTY_MEDIA.md) and the site's Credits view; unused media and authoring panels are removed.

## Current development workflow

This standalone repository preserves the 19 October final copy on
`hands-on-session-use`. The `main` branch is an answer-review version: each quiz
ends with a **Reveal answer / Hide answer** toggle, and the top of the page has **Final scoreboard**,
**Reference list**, and **Instruction manual (pdf)** buttons. Inspection tools remain
available without answering. Quiz answer submission is disabled in both the
participant interface and API. Answers require an exact match to the reviewed
media hash; references contain answer spoilers.

Participant sign-in is retained. The scoreboard displays stored results only
after an instructor publishes them, and exposes only rank, nickname and score.
This local source copy includes no event responses. Existing instructor tracker
controls remain available for retained data, but CSV export is removed; the review
branch collects no new quiz responses. To run a submission-based workshop, use
`hands-on-session-use`.

Manual observations, detector outputs, watermarks, provenance, and source labels remain separate evidence; an unusual pattern is not proof of synthesis. No live inference occurs.

## Local install and run

Requirements:

- macOS or another system with `zsh`
- Node.js 22.13 or newer
- network access during the first installation if the package cache is empty

From this directory:

```sh
./install.sh
./run.sh
```

The launcher opens the instructor page and prints the participant address. Use `./run.sh --no-open` to avoid opening a browser. Local settings, dependencies, build output, and workshop responses are generated on the machine and are excluded from source control.

Fresh setup uses `interpol2026` for both participant entry and the admin key,
and keeps open workshop mode disabled. The launcher binds to
`0.0.0.0:3001` so other devices on the same network can test the site;
`./run.sh --local-only` restricts it to this computer. Change the participant
passcode in the ignored `.dev.vars` file and restart before a real session. The
two credentials are deliberately identical in this demonstration copy. Read the local instructor key in a
private terminal with `sed -n 's/^LOCAL_ADMIN_KEY=//p' .dev.vars`.

This repository began as the final source snapshot of 19 October 2026; `main`
also includes the later review, landing-page and slides changes. No event
participant data, live deployment secrets, model weights or dependency caches
are included in source control. This standalone repository has its own local Git history. Docker
secret preparation also defaults both credentials to
`interpol2026`. Anyone knowing this shared value can access admin controls,
including the data-clear confirmation; choose separate private credentials
before using it for a protected live event. Local generated state is not part
of the source distribution.

## Docker server deployment

The supported self-hosted layout is one application container, one persistent
state volume, and an optional Caddy container for HTTPS. It deliberately does
not use multiple application replicas: the local D1/R2 state is unsuitable for
active-active sharing.

For a new server deployment:

```sh
cp deploy.env.example deploy.env
node scripts/prepare-docker-secrets.mjs
# Edit PUBLIC_ORIGIN and SITE_DOMAIN in deploy.env.
docker compose --env-file deploy.env --profile proxy build --pull
docker compose --env-file deploy.env --profile proxy up -d
curl --fail --show-error https://workshop.example.org/api/health
```

The container refuses weak placeholder credentials, requires HTTPS for a public
origin, applies migrations before startup, runs without root privileges, and
does not include model weights, research assets, local state or prior responses.
In the proxy profile, Caddy serves the read-only public sample directory with
native byte-range support so video timelines remain seekable; the application
handles every other request.
See [`DOCKER_DEPLOYMENT.md`](DOCKER_DEPLOYMENT.md) for DNS/firewall setup,
secret handling, verification, backup, update and cold-standby procedures.

## Bundled workshop material

The default order is:

1. a source-labelled SD3.5 synthetic valley image with manual inspection and four cached classifier outputs;
2. source-labelled authentic AIGVDBench video, followed by quarter-speed and adjacent-frame replay, six cached sampled-frame outputs, and two cached video-oriented results;
3. source-labelled Sora-generated AIGVDBench video using the same manual timeline procedure and the same eight-result presentation;
4. source-labelled authentic image, comparing ordinary compression with JPEG residuals before four cached classifier outputs;
5. purpose-selected authentic portrait with manual inspection and six cached classifier outputs;
6. purpose-selected synthetic portrait using the identical manual procedure before six cached classifier outputs;
7. publisher-documented still-photo face swap between two declared synthetic adult identities, followed by manual portrait views and six cached classifier outputs;
8. presenter-recorded video with a fictional Z-Image-Turbo face transferred using FaceFusion HyperSwap 1a, native mouth/lip exclusion and call-quality encoding, with six sampled-frame classifier outputs and two video-oriented results;
9. contributor-created manipulated portrait, described by the contributor as an AI-generated base followed by a face swap, with manual views and six cached classifier outputs; and
10. contributor-created authentic camera photograph with optically shaped heart bokeh, with manual views and five cached classifier outputs while the face-only detector remains explicitly unavailable.

The portrait pair was deliberately selected after inspecting detector outputs. The AIGVDBench video pair was instead selected by visual inspection before the final detector runs. Contributor cases have the source and permission limitations recorded below. These are disclosed teaching cases, not random samples, benchmarks, accuracy estimates, detector votes, or claims that one tool is generally better. Six video rows analyse sampled still frames; D3 and PwTF-DVD are separate task-specific video methods. None analyses audio or establishes authenticity.

The ten-card default totals about 28 minutes before joining and discussion. All quizzes provide Edges, High-pass detail, Compression comparison and JPEG residual view, plus zoom. For videos these image tools inspect a pre-selected still frame, while timing controls operate on the video. Authentic item and portrait references have the same manual tools and no detector scores. Manual views run locally in the browser and remain separate from cached model evidence; they do not modify source media or produce an authenticity verdict.

In this workshop, authentic means camera-origin content, not necessarily an untouched file. “Real photo edited” means changes to depicted content rather than routine colour adjustment, resizing, compression or metadata removal. Quiz 4 is source-labelled camera-origin, but its metadata lists Snapseed 2.0 and the editing steps are unknown. Its answer is not independent proof of no content editing. Quiz 10 was orientation-corrected, resized and JPEG re-encoded as well as metadata-stripped; its optical heart bokeh is contributor-declared.

Inspection aids and selected cached results are available from the start of each
case; the reversible first-answer gate remains disabled in configuration. The
initial judgement and the later multi-select classification are still stored
separately. Participants may select more than one classification, such as
synthetic generation plus face swap. Video detector evidence uses two clear
tabs: **Detector scores** and **Approximate time**.

The watermark playground runs in the browser. It demonstrates simple LSB/DCT payload storage; it is not encryption, ownership proof, signed provenance, or a production watermark.

See the site's **Credits and sources** view and [`THIRD_PARTY_MEDIA.md`](THIRD_PARTY_MEDIA.md) for current sources, reuse terms, method links, and caveats.

## Source layout

- `app/`, `components/`, `hooks/`, `lib/`: website source and bundled cached evidence
- `public/`: the selected public media, participant PDF reference, and watermark fixture
- `slides/`: the presenter-supplied PowerPoint used by the authenticated slides download
- `drizzle/`, `db/`: local D1 schema and migrations
- `install.sh`: installs the locked JavaScript dependencies and prepares a blank local database
- `run.sh`: applies migrations and starts the local site
- `Dockerfile`, `compose.yaml`, `deploy/`: single-instance VPS deployment with optional HTTPS
- `scripts/prepare-docker-secrets.mjs`: creates untracked deployment credentials without printing them
- `DOCKER_DEPLOYMENT.md`: deployment, validation, backup and recovery runbook

The repository intentionally excludes prior workshop databases and responses, model checkpoints, detector environments, research corpora, private contributor source files, superseded local-only media, and generated build/cache directories. The two selected contributor image derivatives are included under explicit repository/workshop authorisation confirmed on 29 September 2026; no general reuse licence is granted. Quiz 8 has separate contributor authorisation dated 11 October. See [`THIRD_PARTY_MEDIA.md`](THIRD_PARTY_MEDIA.md) for the current assets' permission, source and hash records.
