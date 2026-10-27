# Docker deployment

This is the recommended self-hosted layout for the workshop:

```text
participants -> HTTPS/Caddy -> one Evidence Lab container -> one persistent state volume
```

The application container runs the compiled Worker bundle with Wrangler's local
`workerd` runtime. This is a practical, rehearsable deployment for the short
workshop, but it is deliberately **single-instance**. Do not run two application
replicas against the local D1/R2 volume. A later high-availability deployment
should use managed Cloudflare D1/R2 or another shared database and object store.

## 1. Prepare the server

Use a Linux VPS with Docker Engine and the Docker Compose plugin. A 2-vCPU,
4-GiB server should be sufficient for the current read-mostly site; 8 GiB is a
more comfortable minimum if the image is built on the VPS. Network capacity and
the selected videos matter more than CPU.

For the HTTPS profile:

- point the workshop domain's DNS record to the VPS;
- allow inbound TCP 80 and 443 (and UDP 443 for HTTP/3);
- keep SSH restricted to administrator addresses or a private network;
- do not expose port 3001 publicly.

Run all remaining commands from this repository directory on the server.

## 2. Create deployment configuration and secrets

```sh
cp deploy.env.example deploy.env
node scripts/prepare-docker-secrets.mjs
```

The script creates an owner-only mode-0700 `secrets/` directory containing two
mode-0644 files and refuses to replace existing values. Linux Docker Compose
bind-mounts file-backed secrets without remapping ownership, so the files need
to be readable by the container's unprivileged user; the private parent
directory prevents other host users from reaching them. The script does not
print either secret. In this final demonstration copy, both values default to
`interpol2026`. This is a public demo credential, not a private production secret.
For a protected deployment replace both files with separate private values.

Edit `deploy.env` and replace both example hostnames with the real domain:

```dotenv
PUBLIC_ORIGIN=https://workshop.example.org
SITE_DOMAIN=workshop.example.org
```

Leave `APP_BIND_ADDRESS=127.0.0.1`. The container refuses to start if the
instructor key is not 12–128 characters, the participant passcode is a
weak placeholder (including the development value `a`), open access is enabled,
or a non-loopback public origin does not use HTTPS.

To use a chosen event passcode instead of the generated one, replace the single
line in `secrets/participant_passcode.txt`, retain mode 0644 on the file, and
retain mode 0700 on the parent directory. It must be 8–64 characters, have no
leading/trailing whitespace, and must not be a documented placeholder.

## 3. Build and start with HTTPS

### Optional direct-IP HTTPS access

Keep `PUBLIC_ORIGIN` and `SITE_DOMAIN` set to the existing domain. To also offer
the same protected workshop at its public IP, add these non-secret settings to
`deploy.env` (replace the documentation-only IP with the VPS's actual address):

```dotenv
SITE_IP=192.0.2.10
PUBLIC_IP_ORIGIN=https://192.0.2.10
```

```sh
cp deploy/ip-access.caddy.example deploy/caddy-extra/ip-access.caddy
cp deploy/ip-default-sni.caddy.example deploy/caddy-global-extra/ip-default-sni.caddy
```

Then rebuild/start normally below. Caddy requests an IP certificate from Let's
Encrypt using its `shortlived` ACME profile and automatically renews it in the
existing persistent Caddy volume. TCP 80 and 443 must remain reachable for renewal;
verify issuance with a normal TLS-validating browser/curl before sharing the IP
link. The second optional file selects the IP certificate when literal-IP clients
omit SNI; named domain clients still receive the domain certificate. HTTP redirects
to HTTPS rather than accepting passcodes in clear text.
See [Let's Encrypt's IP-certificate announcement](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability)
and [Caddy's ACME profile configuration](https://caddyserver.com/docs/caddyfile/directives/tls).

Both entry points use the same server-side participant code and database, but
host-only cookies require separate sign-in on each address. Caddy overwrites a
dedicated origin header, and the backend accepts only the two configured origins;
cross-origin POSTs remain rejected. Keep port 3001 private and preserve this
header-overwrite behavior if replacing Caddy. Changing the participant code
invalidates old participant sessions without deleting their responses. Never
commit private replacement credentials to source files or documentation.

### Optional domain migration

To replace an existing canonical hostname while retaining a redirect from the
former hostname, set `PUBLIC_ORIGIN` and `SITE_DOMAIN` to the new HTTPS origin,
set `LEGACY_SITE_DOMAIN` to the former bare hostname, then enable the redirect:

```sh
cp deploy/legacy-domain-redirect.caddy.example deploy/caddy-extra/legacy-domain-redirect.caddy
```

To retain the conventional `www` alias independently of any legacy hostname:

```sh
cp deploy/www-redirect.caddy.example deploy/caddy-extra/www-redirect.caddy
```

Point the new apex A record at the VPS and make `www` a CNAME to the apex. Keep
TCP 80 and 443 reachable so Caddy can obtain and renew both hostname certificates.
The former hostname redirects before reaching the application; the backend accepts
the new canonical origin and the separately configured IP origin only.

### Start the containers

```sh
docker compose --env-file deploy.env --profile proxy build --pull
docker compose --env-file deploy.env --profile proxy up -d
docker compose --env-file deploy.env --profile proxy ps
```

Caddy obtains and renews the TLS certificate. The application applies all D1
migrations before it starts and uses the same `/data/wrangler` volume for the
running D1 and R2 state. The proxy also mounts `public/samples/` read-only and
serves only `/samples/*` directly so browsers receive efficient byte-range
responses when they seek through a video. All other requests go to the
application container.

Verify readiness and inspect the recent logs:

```sh
curl --fail --show-error https://workshop.example.org/api/health
docker compose --env-file deploy.env --profile proxy logs --tail 200 app caddy
```

The health response should be `{"ok":true}`. Then test all of the following
through the public HTTPS address:

1. a wrong participant passcode is rejected;
2. the event passcode admits a nickname and survives refresh;
3. the participant code cannot unlock `/admin`;
4. the instructor key unlocks `/admin`;
5. an answer persists after `docker compose restart app`;
6. every image and video loads, including video seeking/range requests;
7. the browser reports a valid certificate and `Secure` session cookies.

Verify the transport for each bundled video, not only visual playback:

```sh
curl --show-error --silent \
  --header 'Range: bytes=0-1023' \
  --dump-header /tmp/video-range.headers \
  --output /tmp/video-range.body \
  https://workshop.example.org/samples/video/quiz-video-authentic-hard.mp4
grep -Ei '^(HTTP/|Accept-Ranges:|Content-Range:|Content-Length:)' /tmp/video-range.headers
wc -c /tmp/video-range.body
```

The response must be `206`, cover bytes `0-1023`, report a content length of
`1024`, and write exactly `1024` bytes. Repeat this check for the other two
bundled MP4s under `public/samples/`. The application also has a
browser-side compatibility fallback for direct Wrangler access, but the public
event path should use Caddy's native range delivery.

Read the event code and instructor key only in a private terminal:

```sh
cat secrets/participant_passcode.txt
cat secrets/local_admin_key.txt
```

Share only the participant passcode with the audience.

## 4. Logs, updates and shutdown

Follow logs during a rehearsal or event:

```sh
docker compose --env-file deploy.env --profile proxy logs --follow --tail 200
```

After changing the source, rebuild and recreate the containers:

```sh
docker compose --env-file deploy.env --profile proxy up -d --build
```

If Wrangler ever lists migration names beginning with `._`, macOS AppleDouble
metadata entered the checkout before the image was built. Those files are not
SQL migrations. Remove only the `._*` files under `drizzle/`, then rebuild the
application image. The repository's Git and Docker ignore rules exclude this
metadata from future commits and image build contexts.

Migrations run automatically and are recorded by D1. Stop the deployment with:

```sh
docker compose --env-file deploy.env --profile proxy down
```

Do **not** add `--volumes`: the named volume contains workshop responses and
uploaded media.

## 5. Back up persistent state

Back up the entire state volume while the application is stopped. Choose a new
archive name for each backup.

```sh
mkdir -p backups
docker compose --env-file deploy.env --profile proxy stop app
docker run --rm \
  --volume evidence-lab_evidence_lab_state:/source:ro \
  --volume "$PWD/backups:/backup" \
  alpine:3.22 \
  tar -czf /backup/evidence-lab-state-before-event.tar.gz -C /source .
docker compose --env-file deploy.env --profile proxy start app
```

Protect the archive and secret files separately. Test a restore on the standby
server before travel; a backup that has never been restored is not a verified
recovery plan.

## 6. Failure recovery and scaling boundary

Keep the same tested image, configuration, secrets and a recently restored
volume on a cold-standby VPS or the presentation laptop. DNS can be switched to
that host if the primary VPS fails. Any responses written after the last backup
will not be present, and participants may need to enter again.

Do not put two live application containers behind a load balancer. The local
Miniflare D1/R2 state is not an active-active datastore. Kubernetes adds
operational risk without solving that state problem. Seamless failover requires
moving the bindings to managed/shared services.

## Important limitations

- The nickname/passcode page is an event-admission barrier, not individual
  identity authentication.
- Files compiled under `public/` can still be fetched directly by someone who
  already knows their URLs. Move media behind authenticated object delivery if
  confidentiality is required.
- The image intentionally contains no detector checkpoints, model environments,
  research corpora, local databases or previous participant responses.
- Wrangler's local runner is a development facility even though this container
  serves the compiled production bundle. Use this deployment only after an
  end-to-end rehearsal; prefer managed D1/R2 for a longer-lived public service.
- The bundled Caddy configuration does not add application-level rate limiting.
  For a longer-lived internet service, place a CDN/WAF limit on `/api/join` and
  `/api/local-login`; allow for many workshop devices sharing one public IP.
- Before the event, perform a realistic load rehearsal from multiple devices.
  Earlier API concurrency checks did not simulate 50 simultaneous video streams
  or venue Wi-Fi.

## Primary operational references

- [Cloudflare Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Docker Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
