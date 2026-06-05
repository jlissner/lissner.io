---
status: approved
date: 2026-05-05
complexity: 3
branch: feat/split-ui-api-docker-hosting
---

# Split UI and API into separate Docker services

## Non-goals

- No Kubernetes/Helm migration in this change.
- No change to Ollama GPU requirements or the `ollama` service topology.
- No new auth mechanism (JWT cookies and existing flows stay).
- No commitment to production hostnames outside the `lissner.io` registrable domain for CORS (other apexes would need explicit product work).

## Why

The production stack today builds one **`app`** image that runs Node with the API **and** serves **`ui/dist`** from the same process (`express.static` in `createConfiguredApp`). The operator wants **independent Docker services** for the UI and the API when hosting—clearer boundaries, separate image lifecycles, and room to scale or harden each tier without coupling static delivery to the API process.

## What Changes

### Features Added

- `.grimoire/changes/split-ui-api-docker-hosting/features/hosting/separate-ui-api-containers.feature` — behavioral baseline for hosted split stack

### Decisions Added

- `.grimoire/changes/split-ui-api-docker-hosting/decisions/0006-split-ui-api-docker-hosting.md` — record routing, static server choice, and migration from monolith image

### Baseline to Update After Approval

- `features/hosting/separate-ui-api-containers.feature` (promote from change copy)
- `HOST.md`, `docker-compose.yml`, `scripts/docker-compose.sh`, `package.json` host scripts, `server/Dockerfile`, new UI image scaffold — **implementation** follows **`grimoire-plan`** / apply; not in this manifest as file list beyond compose/docs

## Assumptions

| Assumption                                                                                                                                                                                                                        | Evidence                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Public API host** is **`api.lissner.io`** (TLS); Traefik (or equivalent) routes that hostname to the API service                                                                                                                | **Operator requirement**                                                                                    |
| **Web UI** is served from **`lissner.io`** and/or subdomains (e.g. **`www`**, app-specific hosts); the SPA and **`/ws/activity`** use **`api.lissner.io`** as the API host (build- or runtime-configured so users do not type it) | **Unvalidated** — exact UI hostname(s) to document in `HOST.md`                                             |
| The API **CORS policy** allows browser **`Origin`** values for **`https://lissner.io`** and **`https://*.lissner.io`** (credentialed requests as required by the product)                                                         | **Operator requirement** — exact matching rules (wildcard semantics, scheme, ports) finalized in plan/apply |
| **`ollama`** stays a dependency of the **API** service only; the UI container does not call Ollama directly                                                                                                                       | **Validated** — current architecture                                                                        |
| Operator accepts **two images** to build/push (API + UI) and Compose/Traefik rules for **two public hostnames**                                                                                                                   | **Validated** by split design                                                                               |
| Local **`npm run dev`** / **`host:local`** behavior can stay developer-friendly; production Docker split is the main target                                                                                                       | **Unvalidated**                                                                                             |

## Pre-Mortem

1. **Cross-origin cookies and sessions** — Session cookies must be valid when the UI is **`lissner.io`** and the API is **`api.lissner.io`**; misconfigured **`Set-Cookie`** **`Domain`** / **`SameSite`** breaks login. Mitigate with explicit cookie policy and auth E2E tests.
2. **CORS regression** — A new UI subdomain under **`lissner.io`** might be blocked if CORS is a fixed list instead of a rule matching **`*.lissner.io`**. Mitigate with tests for apex + sample subdomain and documented semantics.
3. **Wrong API host in client** — Stale builds pointing at relative **`/api`** only. Mitigate with production build/config checks and smoke tests against **`api.lissner.io`**.
4. **Health checks / TLS** — Two routers and certs for **`api`** vs apex; mitigated by `docker compose config -q` and manual checks per host.
5. **PWA / Service worker** — Cross-origin API URLs must remain consistent with SW scope; mitigated by testing install + activity flows.

## Prior Art

| Option                                                  | Notes                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Keep monolith container**                             | Simplest; fails the stated goal                                                |
| **Path-based split on one hostname**                    | Simplest CORS story; **superseded** by operator choice of **`api.lissner.io`** |
| **Subdomain API + static UI + explicit CORS allowlist** | Matches **`api.lissner.io`** and origins **`lissner.io`** / **`*.lissner.io`** |

**Chosen direction (for plan/review):** **Subdomain split:** UI container behind **`lissner.io`** (and subdomains as needed), API behind **`api.lissner.io`**, with CORS (and related browser security headers/policy) so credentialed API and **`wss://api.lissner.io/ws/activity`** work from permitted **`lissner.io`** web origins. API image **need not** ship **`ui/dist`**.

## Overlapping Changes

None identified; other active grimoire changes target product features, not Docker topology.
