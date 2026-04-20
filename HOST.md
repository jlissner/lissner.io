# Hosting Guide

Deploy stack: **Traefik** (TLS) → **app** (Node API + static UI) + **Ollama on NVIDIA GPU**. Compose file: `docker-compose.yml` reserves a GPU for Ollama; **CPU-only hosts cannot run this stack as-is**.

## Prerequisites

### 1. NVIDIA Container Runtime (required)

```bash
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Confirm a GPU is visible: `nvidia-smi`. Without a working NVIDIA stack, **`ollama`** will not start and **`depends_on: service_healthy`** will block **`app`**.

### 2. Docker permissions

Add your user to the `docker` group (then log out and back in):

```bash
sudo usermod -aG docker $USER
```

Or use `sudo` with Docker commands.

## Environment before deploy

Create a **`.env`** file in the repo root (Compose reads it automatically for **variable substitution** in **`docker-compose.yml`**). **`npm run host:*`** scripts use **`scripts/docker-compose.sh`**, which passes **`--env-file .env.prod`** when that file exists so the same substitution can read **`ACME_EMAIL`**, **`TRAEFIK_RULE`**, **`SERVER_PORT`**, etc. from **`.env.prod`**.

If you run **`docker compose`** yourself, add **`--env-file .env.prod`** when those variables live only in **`.env.prod`**, e.g. **`docker compose --env-file .env.prod config`**.

At minimum in **`.env`** and/or **`.env.prod`**:

| Variable       | Required                        | Purpose                                                                                                                     |
| -------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `ACME_EMAIL`   | Yes for Traefik + Let’s Encrypt | Email for certificate registration                                                                                          |
| `TRAEFIK_RULE` | Optional                        | Traefik router rule (e.g. `Host(\`photos.example.com\`)`); compose defaults to a sample hostname — override for your domain |
| `HTTPS_PORT`   | Optional                        | Host port for Traefik HTTPS (default `443`)                                                                                 |
| `HTTP_PORT`    | Optional                        | Host port for Traefik HTTP → HTTPS redirect (default `80`)                                                                  |

The **`app`** service uses **`env_file: .env.prod`** (optional if the file is absent) so AWS, **`SESSION_SECRET`**, and other keys are set in the container’s **`process.env`**.

**Compose `${VAR}` substitution** (used in **`docker-compose.yml`** for Traefik’s **`ACME_EMAIL`**, router rules, ports, etc.) comes **only** from: the project **`.env`** file, your **shell environment**, and files passed as **`docker compose --env-file …`**. It does **not** read **`env_file:`** on services — those keys are injected **into containers** at runtime, not used to replace **`${…}`** in the compose file.

So **`ACME_EMAIL` in `.env.prod` alone** is enough **only** when Compose also sees it for substitution: e.g. run **`bash scripts/docker-compose.sh …`** (adds **`--env-file .env.prod`** when present), or **`docker compose --env-file .env.prod …`**, **or** put **`ACME_EMAIL=…`** in **`.env`** in the repo root.

### Where to put `ACME_EMAIL` (if you do not want it in `.env.prod`)

Put it in **`.env`** at the repo root (same level as **`docker-compose.yml`**). Compose **loads `.env` automatically** for **`${ACME_EMAIL}`** — no **`--env-file`** needed. **`npm run deploy`** runs **`host:config`**, which uses **`scripts/docker-compose.sh`**, so interpolation sees **`.env`** even when **`.env.prod`** is missing or does not define **`ACME_EMAIL`**.

**Either** is valid for deploy:

| Location        | When it applies                                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`.env`**      | Always used for compose substitution (Traefik **`ACME_EMAIL`**, optional **`TRAEFIK_RULE`**, ports, …).                                                      |
| **`.env.prod`** | Used for substitution **when** **`scripts/docker-compose.sh`** runs and **`--env-file .env.prod`** is added (e.g. **`npm run host`**, **`npm run deploy`**). |

You only need **`ACME_EMAIL`** in **one** of those files for **`docker-compose.yml`**; avoid duplicating unless you keep them in sync on purpose.

Keep app secrets in **`.env.prod`** (do not commit). See **`.env.prod.example`**.

## Build and deploy

The Docker image **does not compile** TypeScript or Vite; it copies **`server/dist`** and **`ui/dist`** from the build host. Always run a full build before building images.

| Command               | Description                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm run deploy`      | **`npm run validate`** (lint, test, compose config) → **`npm run host`**                                                      |
| `npm run validate`    | Lint, unit tests, `docker compose config -q`                                                                                  |
| `npm run host`        | **`npm run build`** → Docker build (`--no-cache`) → `docker compose up -d`                                                    |
| `npm run host:build`  | Build images only (`docker compose build --no-cache`)                                                                         |
| `npm run host:up`     | Start containers and **wait** until services with healthchecks are **healthy** (so Traefik does not hit a still-starting app) |
| `npm run host:down`   | Stop containers                                                                                                               |
| `npm run host:pull`   | Pull Ollama embedding model (`nomic-embed-text`) into the running container                                                   |
| `npm run host:logs`   | Follow logs for all services                                                                                                  |
| `npm run host:status` | `docker compose ps`                                                                                                           |
| `npm run host:local`  | Local dev without Docker (Ollama + server + Vite)                                                                             |

## First-time setup

1. Configure **`.env`** (see above), especially **`ACME_EMAIL`** and **`TRAEFIK_RULE`** for your hostname.
2. Run **`npm run host`** (includes `npm run build`).
3. Pull the embedding model: **`npm run host:pull`**
4. Check **`npm run host:status`**

The app is reachable on the host/port configured in Traefik (see **`TRAEFIK_RULE`** and host firewall). **HTTP** on **`HTTP_PORT`** (default **80**) redirects to **HTTPS** on **`HTTPS_PORT`** (default **443**). Forward **WAN 80 → LAN `HTTP_PORT`** if you want `http://` URLs to upgrade automatically. Direct **`HOST_PORT`** access hits the API container without Traefik (useful for debugging).

## Manual commands

Prefer **`bash scripts/docker-compose.sh …`** (or **`npm run host:status`** / **`host:logs`**) so **`.env.prod`** is included for interpolation. Otherwise pass **`--env-file .env.prod`** yourself.

```bash
bash scripts/docker-compose.sh ps
bash scripts/docker-compose.sh logs -f app
bash scripts/docker-compose.sh logs -f ollama
bash scripts/docker-compose.sh logs -f traefik
bash scripts/docker-compose.sh restart app
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

→ `npm run host:pull`

### Port already in use

```
Error: listen EADDRINUSE: address already in use
```

→ Stop a local dev server (e.g. `pkill -f "tsx watch"`) or change **`HOST_PORT`** / **`HTTPS_PORT`** / **`HTTP_PORT`** in `.env`.

### Traefik ACME email empty / TLS fails

Compose warns if **`ACME_EMAIL`** is unset for **`${ACME_EMAIL}`** in **`docker-compose.yml`**. Set **`ACME_EMAIL`** in **`.env`** (repo root), **or** run Compose with **`--env-file .env.prod`** (e.g. **`bash scripts/docker-compose.sh up -d traefik`** when **`.env.prod`** exists), then recreate Traefik.

### Traefik `EntryPoint doesn't exist` / `No valid entryPoint`

Router labels must match the **entrypoint names** in the Traefik static config. This project defines **`web`** on port 443 (`--entrypoints.web.address=:443`) for TLS and **`webhttp`** on port 80 (`--entrypoints.webhttp.address=:80`) for redirects, so HTTPS routers use **`entrypoints=web`** and the HTTP redirect router uses **`entrypoints=webhttp`**.

### Let's Encrypt HTTP 429 / rate limit

Repeated failed validations (wrong DNS, wrong port 443, bad router before the fix above) can trigger **`too many failed authorizations`**. Wait for the retry time in the error, fix DNS and Traefik, then try again. For testing, consider Let’s Encrypt **staging** (separate Traefik resolver config — not in this repo by default).

### App cannot reach Ollama

The **`app`** service joins both the **`traefik`** and **`default`** networks so it can talk to Traefik and to the **`ollama`** service. If you change networks, confirm **`OLLAMA_HOST=http://ollama:11434`** still resolves inside the **`app`** container.

### Gateway Timeout (504) right after `host:down` / `deploy`

**What’s going on:** Traefik can route to the **`app`** container as soon as it exists, but **Node is not listening yet** until startup finishes (including optional **S3 database restore** when there is no local DB yet). Requests in that window can hang and show **504 Gateway Timeout**.

**What we do in this repo:**

- **`app`** exposes **`GET /health`** (no auth) and Docker **`healthcheck`** probes it.
- **`npm run host:up`** runs **`docker compose up -d --wait`**, which blocks until **`app`** (and **`ollama`**) report **healthy**, so **`npm run deploy`** does not return “done” while the app is still starting.

We intentionally **do not** use Traefik’s **load-balancer** HTTP healthcheck (`traefik.http.services.*.loadbalancer.healthcheck.*`). Those checks are easy to misconfigure and can mark every backend as down, which surfaces as **503 no available server**. Docker’s healthcheck plus **`--wait`** is enough to avoid hitting the app before it listens.

If you start Compose **without** `--wait` (e.g. raw `docker compose up -d`), wait a few seconds or watch **`bash scripts/docker-compose.sh ps`** until **`app`** is **healthy** before loading the site.

Requires **Docker Compose v2.20+** for `up --wait`. If your CLI errors on `--wait`, upgrade Docker / Compose or run **`bash scripts/docker-compose.sh up -d`** and wait manually.

### Ollama container fails or stays unhealthy (`dependency ollama failed to start`)

1. **GPU** — Compose requires an NVIDIA GPU (`deploy.resources.reservations.devices`). Fix drivers / **`nvidia-container-toolkit`** / **`nvidia-smi`** (see **GPU not available** above).

2. **Healthcheck** — The image does not ship **`curl`**. The stack uses **`ollama list`** with a **`start_period`** so the daemon can start first. Check logs: **`bash scripts/docker-compose.sh logs ollama`**.

### Stale UI or API after code changes

Run **`npm run build`** before **`npm run host:build`** (or use **`npm run host`**, which builds first).
