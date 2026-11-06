# Hosting Guide

Deploy stack: **Traefik** (TLS) → **`api`** (Node API + WebSocket) + **`ui`** (nginx static SPA) + **`graphql`** (PostGraphile) + **Ollama on NVIDIA GPU**. Compose file: `config/docker-compose.yml` reserves a GPU for Ollama; **CPU-only hosts cannot run this stack as-is**.

### Public hostnames (example: Lissner)

- **`VITE_API_HOST`** — e.g. `api.lissner.io` (Traefik routes TLS here to the **`api`** service).
- **`PICS_UI_HOST`** — hostname for the static UI only (e.g. `lissner.io`); Traefik routes **only** this exact host to the **`ui`** service.
- **`GRAPHQL_HOST`** — e.g. `query.lissner.io` (Traefik routes TLS here to the **`graphql`** PostGraphile service).
- The API and GraphQL services allow browser **CORS** from `https://lissner.io` and `https://*.lissner.io` when **`NODE_ENV=production`** (and whenever **`BDD_STRICT_CORS=1`** is set for tests).

## Prerequisites

### 1. NVIDIA Container Runtime (required)

```bash
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Confirm a GPU is visible: `nvidia-smi`. Without a working NVIDIA stack, **`ollama`** will not start and **`depends_on: service_healthy`** will block **`api`**.

### 2. Docker permissions

Add your user to the `docker` group (then log out and back in):

```bash
sudo usermod -aG docker $USER
```

Or use `sudo` with Docker commands.

## Environment before deploy

Create a **`config/.env`** file (and/or **`config/.env.prod`**). **`npm run host:*`** uses **`scripts/docker-compose.sh`**, which runs Compose with **`-f config/docker-compose.yml --project-directory <repo>`** and passes **`--env-file config/.env`** / **`config/.env.prod`** when those files exist so **`${ACME_EMAIL}`**, **`TRAEFIK_RULE`**, **`SERVER_PORT`**, etc. resolve.

If you run **`docker compose`** yourself, prefer **`bash scripts/docker-compose.sh …`**, or pass **`-f config/docker-compose.yml --project-directory . --env-file config/.env.prod`**.

At minimum in **`config/.env`** and/or **`config/.env.prod`** (for compose **variable substitution**):

| Variable                              | Required                        | Purpose                                                                                                             |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ACME_EMAIL`                          | Yes for Traefik + Let’s Encrypt | Email for certificate registration                                                                                  |
| `VITE_API_HOST`                       | Yes for routers                 | Hostname for the API (e.g. `api.lissner.io`)                                                                        |
| `PICS_UI_HOST`                        | Yes for routers                 | Hostname for the static UI (e.g. `lissner.io`); must match the browser **`Host`** header exactly                    |
| `GRAPHQL_HOST`                        | Yes for routers                 | Hostname for PostGraphile (e.g. `query.lissner.io`)                                                                 |
| `GRAPHQL_PORT`                        | Yes for graphql service         | Container listen port (default **5678**)                                                                            |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | Yes                             | Compose Postgres + apps. Quote password if it contains `#`. No defaults.                                            |
| `INTERNAL_POSTGRES_HOST` / `_PORT`    | Yes for Compose port bind       | Host publish (`127.0.0.1:${INTERNAL_POSTGRES_PORT}:5432`). Prod typically **5433**.                                 |
| `EXPOSED_POSTGRES_HOST` / `_PORT`     | Yes for api/graphql             | What Node uses to connect. Inside Compose: **`postgres`** / **`5432`**. On the laptop: **`127.0.0.1`** / bind port. |
| `GRAPHQL_DATABASE_NAME`               | Yes for GraphQL                 | Database name for PostGraphile (e.g. `lissner`).                                                                    |
| `MEDIA_DATABASE_NAME`                 | Yes                             | Media API DB name (e.g. `media`). Vitest uses `media_test`.                                                         |

The **`api`** and **`graphql`** services use **`env_file: config/.env.prod`** so AWS, **`SESSION_SECRET`**, **`EXPOSED_POSTGRES_*`**, DB names, and related keys are set in the container’s **`process.env`**. Compose also forces **`OLLAMA_HOST=http://ollama:11434`** on **`api`**.

**Compose `${VAR}` substitution** (used in **`config/docker-compose.yml`** for Traefik’s **`ACME_EMAIL`**, router rules, ports, etc.) comes **only** from: **`config/.env`** (via **`--env-file`**), your **shell environment**, and files passed as **`docker compose --env-file …`**. It does **not** read **`env_file:`** on services — those keys are injected **into containers** at runtime, not used to replace **`${…}`** in the compose file.

So **`ACME_EMAIL` in `config/.env.prod` alone** is enough when you use **`bash scripts/docker-compose.sh …`** (passes **`--env-file config/.env.prod`**), or put **`ACME_EMAIL=…`** in **`config/.env`**.

### Where to put `ACME_EMAIL` (if you do not want it in `config/.env.prod`)

Put it in **`config/.env`**. **`scripts/docker-compose.sh`** passes **`--env-file config/.env`** when that file exists. **`npm run deploy`** / **`host:config`** use that wrapper.

**Either** is valid for deploy:

| Location               | When it applies                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **`config/.env`**      | Used for compose substitution when present (Traefik **`ACME_EMAIL`**, optional **`TRAEFIK_RULE`**, ports, …).        |
| **`config/.env.prod`** | Used for substitution **when** **`scripts/docker-compose.sh`** runs (e.g. **`npm run host`**, **`npm run deploy`**). |

You only need **`ACME_EMAIL`** in **one** of those files for **`config/docker-compose.yml`**; avoid duplicating unless you keep them in sync on purpose.

Keep app secrets in **`config/.env.prod`** (do not commit). See **`config/.env.example`**.

## Local vs on-machine Postgres (ADR 0008)

This host can run **two** Postgres containers:

|                                      | Dev                                             | Prod (Compose host stack)               |
| ------------------------------------ | ----------------------------------------------- | --------------------------------------- |
| Lifecycle                            | `npm run db:up` / `npm run dev`                 | `npm run host`                          |
| Wrapper                              | `scripts/docker-compose-dev.sh`                 | `scripts/docker-compose.sh`             |
| Project / volume                     | `lissnerio-dev` / `lissnerio-dev_postgres-data` | `lissnerio` / `lissnerio_postgres-data` |
| `INTERNAL_POSTGRES_PORT` (host bind) | **5432** (`.env.local`)                         | **5433** (`.env.prod`)                  |
| `EXPOSED_POSTGRES_*` (apps)          | `127.0.0.1:5432`                                | `postgres:5432` (Compose DNS)           |

```bash
npm run db:up          # start dev Postgres only
npm run db:checkpoint  # A1: version + app DBs exist
npm run db:down        # stop dev Postgres (does not touch prod)
```

Safe local wipe: `docker volume rm lissnerio-dev_postgres-data` only. **Never** remove `lissnerio_postgres-data` unless you intend to destroy on-machine prod DB data.

GraphQL: dump remote → restore into **dev** → set **`GRAPHQL_DATABASE_NAME`**. Media: **`npm run db:migrate:media`**. Details: **`packages/db/README.md`**, ADR **0007** / **0008**.

## Build and deploy

The Docker images **do not compile** TypeScript or Vite on their own: **`packages/server/Dockerfile`** copies **`packages/server/dist`**; **`packages/pics/Dockerfile`** copies **`packages/pics/dist`**; **`packages/graphql/Dockerfile`** copies **`packages/graphql/dist`**. **`npm run host`** prepares `dist` selectively; for a one-off image build after a manual **`npm run build`**, use **`npm run host:build`**.

| Command               | Description                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run deploy`      | **`npm run validate`** (lint, test, compose config) → **`npm run host`**                                                                   |
| `npm run validate`    | Lint, unit tests, `docker compose config -q`                                                                                               |
| `npm run host`        | Selective prepare (`tsc -b` + Vite if pics/shared changed) → dirty Docker images only → `docker compose up -d --wait`                      |
| `npm run host:build`  | Build dirty images only (fingerprints in **`.cache/host-build/`**). Force: **`npm run host:build -- --force`** or **`HOST_BUILD_FORCE=1`** |
| `npm run host:up`     | Start containers and **wait** until services with healthchecks are **healthy** (so Traefik does not hit a still-starting **`api`**)        |
| `npm run host:down`   | Stop containers                                                                                                                            |
| `npm run host:pull`   | Re-pull default Ollama models (`nomic-embed-text`, `llava`) into the running container (usually unnecessary; see First-time setup)         |
| `npm run host:logs`   | Follow logs for all services                                                                                                               |
| `npm run host:status` | `docker compose ps`                                                                                                                        |
| `npm run host:local`  | Local dev without Docker (Ollama + server + Vite)                                                                                          |

**Selective builds** ([`scripts/host-build.sh`](scripts/host-build.sh)): fingerprints each image’s inputs (Dockerfiles, lock/workspace manifests, relevant `dist` trees, `docker/ollama`). Unchanged services are skipped. Shared `dist` changes rebuild **api** + **graphql**; Vite runs when pics/shared **sources** change so **ui** picks up the new bundle. First run (no cache) builds everything. Use **`--force`** / **`HOST_BUILD_FORCE=1`** for a clean **`--no-cache`** rebuild of all targeted services.

## First-time setup

1. Configure **`config/.env`** (see above), especially **`ACME_EMAIL`** and **`TRAEFIK_RULE`** for your hostname. In **`config/.env.prod`**, set **`OLLAMA_VISION_MODEL`** (and optionally **`OLLAMA_EMBED_MODEL`**) if you do not want the defaults (**`llava`** and **`nomic-embed-text`**).
2. Run **`npm run host`** (selective prepare + image builds; first run builds everything). The **`ollama`** image (built from **`docker/ollama/`**) starts **`ollama serve`**, pulls those models into the **`ollama-models`** volume on first boot, then **`api`** waits until that finishes (**healthcheck** uses **`start_period: 1200s`** so large downloads can complete).
3. Check **`npm run host:status`**

The site is reachable on **`PICS_UI_HOST`** (static **`ui`** container), **`VITE_API_HOST`** (**`api`** container), and **`GRAPHQL_HOST`** (**`graphql`** container) via Traefik. **HTTP** on port **80** redirects to **HTTPS** on **443**.

## Manual commands

Prefer **`bash scripts/docker-compose.sh …`** (or **`npm run host:status`** / **`host:logs`**) so **`config/.env.prod`** is included for interpolation. Otherwise pass the same flags yourself.

```bash
bash scripts/docker-compose.sh ps
bash scripts/docker-compose.sh logs -f api
bash scripts/docker-compose.sh logs -f ui
bash scripts/docker-compose.sh logs -f graphql
bash scripts/docker-compose.sh logs -f ollama
bash scripts/docker-compose.sh logs -f traefik
bash scripts/docker-compose.sh restart api
bash scripts/docker-compose.sh pull
bash scripts/docker-compose.sh down -v   # removes containers and named volumes (destructive)
```

## Troubleshooting

### GPU not available

```
Error response from daemon: could not select device driver "nvidia" with capabilities: [[gpu]]
```

→ Install NVIDIA container runtime (Prerequisites).

### Permission denied (Docker socket)

```
permission denied while trying to connect to the docker API
```

→ `sudo usermod -aG docker $USER` then log out/in, or `newgrp docker`.

### Ollama model not found

```
Error: model 'nomic-embed-text' not found
```

→ Confirm **`ollama`** logs show pulls finished (`bash scripts/docker-compose.sh logs ollama`). On first boot, downloads can take many minutes. To refresh models manually: **`npm run host:pull`**.

### Port already in use

```
Error: listen EADDRINUSE: address already in use
```

→ Stop a local dev server (e.g. `pkill -f "tsx watch"`) or change **`HOST_PORT`** / **`HTTPS_PORT`** / **`HTTP_PORT`** in `config/.env`.

### Traefik ACME email empty / TLS fails

Compose warns if **`ACME_EMAIL`** is unset for **`${ACME_EMAIL}`** in **`config/docker-compose.yml`**. Set **`ACME_EMAIL`** in **`config/.env`** or **`config/.env.prod`**, then **`bash scripts/docker-compose.sh up -d traefik`**.

### Traefik `EntryPoint doesn't exist` / `No valid entryPoint`

Router labels must match the **entrypoint names** in the Traefik static config. This project defines **`web`** on port 443 (`--entrypoints.web.address=:443`) for TLS and **`webhttp`** on port 80 (`--entrypoints.webhttp.address=:80`) for redirects, so HTTPS routers use **`entrypoints=web`** and the HTTP redirect router uses **`entrypoints=webhttp`**.

### Let's Encrypt HTTP 429 / rate limit

Repeated failed validations (wrong DNS, wrong port 443, bad router before the fix above) can trigger **`too many failed authorizations`**. Wait for the retry time in the error, fix DNS and Traefik, then try again. For testing, consider Let’s Encrypt **staging** (separate Traefik resolver config — not in this repo by default).

### App cannot reach Ollama

The **`api`** service joins both the **`traefik`** and **`default`** networks so it can talk to Traefik and to the **`ollama`** service. **`config/docker-compose.yml` sets `OLLAMA_HOST=http://ollama:11434` on the **`api`** container** so indexing and vision use the Compose DNS name to the bundled **`ollama`** service. A value like **`ollama.internal`** in **`config/.env.prod`** is for Traefik-style routing on other networks and is **not** used for **`api`→Ollama** inside this stack.

If you change networks or use an external Ollama host, edit the **`api`** service **`environment`** in **`config/docker-compose.yml`** (or split overrides) so **`OLLAMA_HOST`** points at a URL the **`api`** container can resolve.

### Local development (no Docker UI/API split)

**`npm run dev`** and **`npm run host:local`** keep the same workflow: Vite serves the SPA and proxies **`/api`** and **`/ws`** to the Node server. Keep **`VITE_API_HOST=localhost`** locally so the SPA uses the Vite proxy; set it to the API hostname (e.g. `api.lissner.io`) only when building for split-host production.

### Gateway Timeout (504) right after `host:down` / `deploy`

**What’s going on:** Traefik can route to the **`api`** container as soon as it exists, but **Node is not listening yet** until startup finishes (including optional **S3 database restore** when there is no local DB yet). Requests in that window can hang and show **504 Gateway Timeout**.

**What we do in this repo:**

- **`api`** exposes **`GET /health`** (no auth) and Docker **`healthcheck`** probes it.
- **`npm run host:up`** runs **`docker compose up -d --wait`**, which blocks until **`api`**, **`ui`**, and **`ollama`** report **healthy**, so **`npm run deploy`** does not return “done” while the API is still starting.

We intentionally **do not** use Traefik’s **load-balancer** HTTP healthcheck (`traefik.http.services.*.loadbalancer.healthcheck.*`). Those checks are easy to misconfigure and can mark every backend as down, which surfaces as **503 no available server**. Docker’s healthcheck plus **`--wait`** is enough to avoid hitting the API before it listens.

If you start Compose **without** `--wait` (e.g. raw `docker compose up -d`), wait a few seconds or watch **`bash scripts/docker-compose.sh ps`** until **`api`** is **healthy** before loading the site.

Requires **Docker Compose v2.20+** for `up --wait`. If your CLI errors on `--wait`, upgrade Docker / Compose or run **`bash scripts/docker-compose.sh up -d`** and wait manually.

### Ollama container fails or stays unhealthy (`dependency ollama failed to start`)

1. **GPU** — Compose requires an NVIDIA GPU (`deploy.resources.reservations.devices`). Fix drivers / **`nvidia-container-toolkit`** / **`nvidia-smi`** (see **GPU not available** above).

2. **Healthcheck** — The image does not ship **`curl`**. The stack uses **`ollama list`** with a **`start_period`** so the daemon can start first. Check logs: **`bash scripts/docker-compose.sh logs ollama`**.

### Stale UI or API after code changes

Run **`npm run build`** (or **`bash scripts/host-build.sh prepare`**) before **`npm run host:build`** if `dist` is stale — or use **`npm run host`**, which prepares first.
