---
status: proposed
date: 2026-05-05
decision-makers: []
---

# Split Docker hosting into separate UI and API containers

## Context and Problem Statement

Production **`docker-compose.yml`** runs a single **`app`** service built from **`server/Dockerfile`**. That image copies **`server/dist`** and **`ui/dist`**; Node serves the API and **`express.static`** for the SPA. The team wants **two containers**—one for static UI delivery and one for the API.

Production hostnames are fixed for this deployment: the **API** is public at **`api.lissner.io`**. Browsers load the SPA from **`lissner.io`** (and may use other subdomains for the UI). The API must **accept cross-origin browser requests** (including credentialed requests) from **`https://lissner.io`** and **`https://*.lissner.io`**.

## Decision Drivers

- Independent image and container lifecycle for UI vs API
- Smaller API image if static assets are not embedded
- Alignment with existing **Traefik** edge routing and two TLS certificates / routers
- Explicit CORS (and cookie) policy that matches **`lissner.io`** and **`*.lissner.io`**
- Predictable API URL for clients: **`https://api.lissner.io`**

## Considered Options

1. **Status quo** — single **`app`** container (Node + static)
2. **Path-based split** — one hostname; Traefik routes **`/api`** and **`/ws`** to the API service
3. **Subdomain split** — UI on **`lissner.io`** (and/or UI subdomains); API on **`api.lissner.io`** with CORS allowing apex + **`*.lissner.io`**

## Decision Outcome

**Chosen option:** **Subdomain split (option 3)** with **API at `api.lissner.io`** and **CORS allowing `https://lissner.io` and `https://*.lissner.io`** (semantics of “subdomain wildcard” nailed down in implementation—e.g. one label under apex—and tested).

**Because:** It matches the operator’s public-DNS layout, keeps static traffic and API traffic on separate hostnames for clear Traefik/service mapping, and centralizes browser access control in explicit origin rules instead of relying on same-origin path routing.

### Consequences

- **Good:** Clear separation of concerns; UI updates can ship without rebuilding the API image (and vice versa)
- **Good:** API host is stable and easy to document
- **Bad:** Session cookies and **`SameSite`** / **`Domain=.lissner.io`** (or equivalent) must be correct or auth breaks across subdomains
- **Bad:** SPA, **`apiFetch`**, media URLs, and WebSocket URLs must use **`https://api.lissner.io`** (or env-driven base) in production builds; mistakes are user-visible
- **Bad:** More Compose and Traefik configuration than a single-host path split

### Cost of Ownership

- **Maintenance burden:** Two services, two routers, TLS for two names, CORS allowlist/wildcard rules, cookie attributes, and **HOST.md** updates whenever hostname policy changes
- **Ongoing benefits:** Easier scaling and hardening per tier; API can be rate-limited or WAF’d independently
- **Sunset criteria:** Revisit if the team standardizes on a single host + path routing for simplicity

### Confirmation

- **`docker compose config -q`** passes with production env
- Manual smoke: UI on a **`lissner.io`** web host, sign in, API calls and **`wss://api.lissner.io/ws/activity`** succeed
- CORS scenarios (apex + multiple subdomains) in **`features/hosting/separate-ui-api-containers.feature`** pass verification after implementation
