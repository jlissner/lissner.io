# Tasks: split-ui-api-docker-hosting

> **Change**: Production Docker stack serves the SPA and the API in **separate containers**; public API at **`https://api.lissner.io`**; CORS allows **`https://lissner.io`** and **`https://*.lissner.io`**; UI builds target the API origin via env.
> **Features**: `features/hosting/separate-ui-api-containers.feature` (promote from `.grimoire/changes/.../features/hosting/` copy)
> **Decisions**: `0006-split-ui-api-docker-hosting.md`
> **Test command**: `npm run test:bdd` (filter: `cucumber-js ... --name "Separate UI"` once feature tags exist, or run full `npm run test:bdd` after promoting the feature)
> **Unit tests**: `npx vitest run` (new CORS tests under `server/src/`)
> **Status**: 0/? tasks complete
>
> **Note**: `manifest.md` is still `status: draft`. Set to `approved` before `grimoire-apply`. `.grimoire/docs/` has no area `.md` files; paths below were taken from the live tree.
>
> **Reuse**
>
> - `createConfiguredApp` + `attachActivityWebSocket` — `server/src/bootstrap/server.ts`, `server/src/index.ts`, `server/src/activity/broadcast.ts`
> - BDD HTTP pattern — `features/step-definitions/auth.steps.ts` (`ensureServer`, `AfterAll` cleanup)
> - Cucumber — `features/step-definitions/**/*.ts`, `npm run test:bdd`
> - UI API wrapper — `ui/src/api/client.ts` (`apiFetch`, `apiUrl`)
> - Vite dev proxy — `ui/vite.config.ts` (`/api`, `/ws` → `apiProxyTarget`)

## 0. Scope hygiene

<!-- context:
  - .grimoire/changes/split-ui-api-docker-hosting/manifest.md
-->

- [ ] **0.1** In `manifest.md`, add **Non-goals** (adjust wording with the user). Suggested bullets: _no Kubernetes/Helm migration in this change; no change to Ollama GPU requirements; no new auth mechanism (still JWT cookies); local dev stays on Vite proxy by default; no commitment to non-`lissner.io` production hostnames_. Ensures plan scope matches **Outcome & Scope** checks for complexity 3.
- [ ] **0.2** Set manifest frontmatter `status: approved` when the user signs off on this task list (or keep `draft` until then—apply stage requires explicit approval).

## 1. Promote Gherkin + negative CORS scenario

<!-- context:
  - .grimoire/changes/split-ui-api-docker-hosting/features/hosting/separate-ui-api-containers.feature
-->

- [ ] **1.1** Copy `.grimoire/changes/split-ui-api-docker-hosting/features/hosting/separate-ui-api-containers.feature` to **`features/hosting/separate-ui-api-containers.feature`** so `npm run test:bdd` discovers it. Keep the grimoire copy in sync when editing.
- [ ] **1.2** Add **`@hosting`** tag on the `Feature:` line for selective runs (`cucumber-js --tags @hosting`).
- [ ] **1.3** Add a scenario (satisfies **Security / QA** gap: blocked origin): e.g. _Scenario: API rejects disallowed browser origins_ — **When** a browser issues an OPTIONS or GET with `Origin: https://evil.example` **Then** the response must **not** include `Access-Control-Allow-Origin: https://evil.example` (and must not use `*` with credentials). Mirror the edit in the grimoire change copy.

## 2. Cucumber: hosting / compose / routing steps

<!-- context:
  - features/hosting/separate-ui-api-containers.feature
  - docker-compose.yml
  - features/step-definitions/auth.steps.ts
-->

- [ ] **2.1** Create **`features/step-definitions/hosting.steps.ts`** with `Given`, `When`, `Then` matching **all** steps in the hosting feature (including new negative scenario). Use **`node:http` `request`** (not `fetch`) when you need to send **`Host`**: `api.lissner.io` and **`Origin`**: table values—`fetch` forbids overriding `Host`.
- [ ] **2.2** **Given production hosting uses Docker Compose with Traefik in front of the application** — Assert **`docker-compose.yml`** exists at repo root and contains a **`traefik`** service and **exactly two** new top-level application services (e.g. **`api`** and **`ui`**) **or** names documented in `HOST.md`, and that the legacy single **`app`** service that bundles UI+API is **removed or renamed** per implementation. _Scenario trace: Background._
- [ ] **2.3** **And the API is reachable at https://api.lissner.io** — No-op or store expected API hostname in world for later steps. _Background._
- [ ] **2.4** **Given the hosted stack is running** — For automated tests, interpret as: in-process **`createConfiguredApp('/nonexistent-ui-dist')` + `attachActivityWebSocket`** listening on **`127.0.0.1`**, with env configured so CORS allowlist is active (**`NODE_ENV=production`** may be required—mirror **`auth.steps.ts`** pattern: set env before dynamic import of server modules). _All scenarios’ Given._
- [ ] **2.5** **When a client requests an API resource at https://api.lissner.io …** — Send **GET** `http://127.0.0.1:${port}/health` with headers **`Host: api.lissner.io`**, **`Origin: https://lissner.io`**. **Then** status **200** and body **`ok`**. _Scenario: API requests reach the API service via the API host._
- [ ] **2.6** **When an authenticated client opens … WebSocket on https://api.lissner.io** — Reuse auth steps to obtain **`access_token`** cookie against the test server; open raw TCP upgrade or use **`ws`** package if already a dependency—if not, use **`node:http`** manual upgrade request with **`Host: api.lissner.io`**, **`Cookie`**, **`Connection: Upgrade`**, **`Upgrade: websocket`**, **`Sec-WebSocket-Key` / `Sec-WebSocket-Version`**. **Then** server responds **101** and connection stays open until closed. _Scenario: WebSocket activity…_
  - If full upgrade is too brittle in CI, **fallback**: assert **`broadcast.ts`** only handles pathname **`/ws/activity`** (existing) and mark step with docstring referencing follow-up E2E—**only** if spike proves flakiness; prefer passing upgrade test.
- [ ] **2.7** **When a browser requests … from the configured UI host** — Assert **`docker-compose.yml`** **`ui`** service image/build exists and Traefik labels include a router rule whose **`Host(...)`** matches **`${UI_HOST}`** or documented **`lissner.io`** (string or env placeholder). **Then** … served by UI service: assert labels reference the **`ui`** service name (not **`api`**). _Scenario: Browser UI assets…_
- [ ] **2.8** **Scenario Outline: API permits credentialed browser origins** — For each **`<origin>`**, **OPTIONS** (preflight) on a representative API path (e.g. **`/api/auth/config`** or **`/health`** with **`Access-Control-Request-Method: GET`**) with **`Origin: <origin>`**, **Then** response includes **`Access-Control-Allow-Origin: <origin>`** (exact match) and **`Access-Control-Allow-Credentials: true`** (if preflight applies to credentialed flows). _Outline examples._
- [ ] **2.9** **Scenario: API rejects disallowed…** — **Then** response **does not** echo **`https://evil.example`** in **`Access-Control-Allow-Origin`**. _Negative scenario._

- [ ] **2.10** **End-to-end use across UI and API hosts** — Assert production UI build injects a **public API origin**: e.g. after **`npm run build`**, grep **`ui/dist/assets/*.js`** for literal **`https://api.lissner.io`** when **`VITE_PUBLIC_API_ORIGIN=https://api.lissner.io`** was set, **or** assert **Vitest** export of **`resolvePublicApiOrigin()`** matches. _Pragmatic stand-in for full browser E2E per existing BDD style._
- [ ] **2.11** **Operator can confirm distinct services** — Parse **`docker-compose.yml`** (read file + string/struct checks) for two keys under **`services:`** for **`api`** and **`ui`** (names per your compose), both **`build:`** or **`image:`**, neither merging UI into API Dockerfile. _Scenario: Operator can confirm…_

## 3. Server: CORS allowlist for `lissner.io`

<!-- context:
  - server/src/bootstrap/server.ts
  - .grimoire/changes/split-ui-api-docker-hosting/decisions/0006-split-ui-api-docker-hosting.md
-->

- [ ] **3.1** Add **`server/src/lib/lissner-cors.ts`** exporting **`isAllowedLissnerCorsOrigin(originHeader: string | undefined): boolean`** — Parse **`Origin`** as URL; **`true`** when scheme is **`https`**, and host is **`lissner.io`** or ends with **`.lissner.io`** (covers **`www`**, **`app`**, and nested subdomains). Reject missing/`null` origin, **`http:`** when **`NODE_ENV=production`**. Guard against typosquat domains (e.g. host **`notlissner.io`** or **`lissner.io.attacker.com`**) by requiring exact apex or **`.lissner.io`** suffix after a registry-safe parse. **No `let`** (project rule).
- [ ] **3.2** Add **`server/src/lib/lissner-cors.test.ts`** (Vitest) — allowed: apex, **`www`**, **`app`**, one nested subdomain example; disallowed: **`https://evil.example`**, **`http://lissner.io`** when enforcing HTTPS, and **`https://lissner.io.evil.test`** (suffix trap via **host === lissner.io** or **endsWith `.lissner.io`** with parse validation—add case that proves no public suffix bypass).
- [ ] **3.3** In **`server/src/bootstrap/server.ts`**, replace **`cors({ origin: true, credentials: true })`** with **`cors({ origin: (origin, cb) => { ... isAllowedLissnerCorsOrigin(origin) ... }, credentials: true })`** (or equivalent) so only listed origins reflect. In **development** (`NODE_ENV !== 'production'`), keep permissive behavior **or** keep Vite origins—document choice in **`HOST.md`** (minimal surprise for local dev).
- [ ] **3.4** Confirm **`server/src/services/jwt-auth-service.ts`** cookie **`sameSite` / `secure`** remain valid for **`lissner.io` ↔ `api.lissner.io`** (same registrable domain). If Vitest proves refresh from UI origin fails, add **`domain: '.lissner.io'`** **only** when env says production split—prefer smallest change; add unit/integration assertion.

**Scenarios satisfied:** CORS outline, negative origin, API health via `Host` header (with 3.x wired).

## 4. UI: configurable API + WebSocket + media URLs

<!-- context:
  - ui/src/api/client.ts
  - ui/src/components/activity/activity-provider.tsx
  - ui/vite.config.ts
  - .grimoire/changes/split-ui-api-docker-hosting/manifest.md (Pre-Mortem)
-->

- [ ] **4.1** Add **`VITE_PUBLIC_API_ORIGIN`** (empty = same-origin for dev). Document in **`.env.example`** and **`HOST.md`**. Production Docker UI build passes **`VITE_PUBLIC_API_ORIGIN=https://api.lissner.io`**.
- [ ] **4.2** In **`ui/src/api/client.ts`**, resolve base URL: if env set, **API calls** use **`${origin}/api/...`** (no double slash); preserve dev relative **`/api`**. Export **`publicApiUrl(path: string)`** for non-`apiFetch` uses (images, XHR, anchors).
- [ ] **4.3** **`ui/src/components/activity/activity-provider.tsx`** — Build WebSocket URL: **`wss://api.lissner.io/ws/activity`** when origin set, else **`${wsProto}//${window.location.host}/ws/activity`**. Ensure **`GET /api/activity`** still works via **`apiFetch`** (cross-origin with credentials).
- [ ] **4.4** Replace hardcoded **`/api/...`** strings in UI feature files:  
       **`ui/src/features/media/components/media-viewer/media-viewer-content.tsx`**, **`media-viewer-details.tsx`**, **`media-utils.ts`**, **`upload-modal-confirm.tsx`**, **`post-media-upload-with-progress.ts`**, **`use-media-bulk-actions.ts`**, **`people-detail.tsx`**, **`people-sidebar.tsx`**, **`people-match-faces-wizard.tsx`**, **`duplicate-reviewer.tsx`** — use **`publicApiUrl`** / **`apiFetch`** as appropriate so **`<img src>`**, **`<a href>`**, and **XHR** hit the API host in production.
- [ ] **4.5** Run **`npm run build`** and fix any broken imports or types; ensure **`npm test`** (Vitest) still passes if UI has unit tests touching URLs.

**Scenarios satisfied:** End-to-end inject assertion; WebSocket; API requests with split host.

## 5. API-only server bundle (no static UI in API container)

<!-- context:
  - server/Dockerfile
  - server/src/bootstrap/server.ts
  - server/src/config/paths.ts
-->

- [ ] **5.1** In **`createConfiguredApp`** (`server/src/bootstrap/server.ts`), only mount static + SPA fallback when **`uiDistDir`** exists **and** directory exists (already partially there)—ensure **`server/Dockerfile`** for the **API** image **stops copying `./ui/dist`**.
- [ ] **5.2** Update **`server/README.md`** one line if it claims the Docker image always includes UI.

**Scenarios satisfied:** API container serves API + WS only.

## 6. UI image + nginx

<!-- context:
  - server/Dockerfile (pattern)
  - HOST.md
-->

- [ ] **6.1** Add **`ui/Dockerfile`** — multi-stage optional; final stage **`nginx:alpine`** (or pinned digest), **`COPY ui/dist`**, custom **`ui/nginx/default.conf`** with **`try_files $uri $uri/ /index.html;`**, **`gzip`** on static assets, listen **80**.
- [ ] **6.2** Add **`ui/nginx/default.conf`** — health: **`location /health { return 200 'ok'; add_header Content-Type text/plain; }`** for Traefik/load checks.

**Scenarios satisfied:** UI static served by UI container (via compose labels check).

## 7. Docker Compose + Traefik

<!-- context:
  - docker-compose.yml
  - scripts/docker-compose.sh
  - HOST.md
-->

- [ ] **7.1** Replace monolithic **`app`** service with **`api`** (build **`server/Dockerfile`**, env **`env_file: .env.prod`**, **`OLLAMA_HOST`**, volume **`app-data`**, **`depends_on: ollama`**, healthcheck hitting **`/health`** with **`Host: api.lissner.io`** **or** direct container port—adjust **`CMD-SHELL`** to match). Expose internal port; Traefik uses **`Host(\`api.lissner.io\`)`** router + TLS.
- [ ] **7.2** Add **`ui`** service (build **`ui/Dockerfile`**), **`depends_on`**: **`api`** optional (usually not required for static); Traefik router **`Host(\`lissner.io\`)`** and optionally **`Host(\`www.lissner.io\`)`** per operator DNS—use **`${UI_HOST}`** / **`${API_HOST}`** in compose from **`.env`** for substitution.
- [ ] **7.3** Ensure **Let's Encrypt** resolver covers **both** routers (same or separate certs—Traefik default per-host cert is fine).
- [ ] **7.4** **`bash scripts/docker-compose.sh config -q`** passes ( **`npm run host:config`** / **`validate`** ). Update **`docker-compose.yml`** hardcoded Traefik email if still literal—prefer **`${ACME_EMAIL}`** only (pre-existing tech debt—touch **only** if required for second router).
- [ ] **7.5** **`npm run host:logs`** / **`host:up`** docs: **`ui`** and **`api`** service names in **`HOST.md`**; replace references to single **`app`** container.

**Scenarios satisfied:** Operator distinct services; Traefik rules; Background compose assumption.

## 8. CI / validate

<!-- context:
  - package.json (validate script)
-->

- [ ] **8.1** Run **`npm run validate`** — lint, Vitest, **`docker compose config -q`**. Fix drift.

## 9. Verification (last)

<!-- context:
  - .grimoire/changes/split-ui-api-docker-hosting/decisions/0006-split-ui-api-docker-hosting.md
-->

- [ ] **9.1** **`npx vitest run`** — all green including **`lissner-cors`**, auth, regressions.
- [ ] **9.2** **`npm run test:bdd`** — all green; **`--tags @hosting`** if you need speed during iteration.
- [ ] **9.3** **`npm run build`** — `tsc` + Vite with **`VITE_PUBLIC_API_ORIGIN`** set for a smoke build.
- [ ] **9.4** **ADR confirmation** — Manual: deploy to staging or run compose locally with **`/etc/hosts`** → hit **`https://lissner.io`** (or hosts alias) and **`https://api.lissner.io`**: sign in, load media thumb, open activity socket (browser devtools). Document in PR/deployment notes.

---

## Design review (next)

Per **`grimoire-plan`**: this change is **complexity 3** — **`grimoire-review`** is **optional**; run if you want multi-persona review, otherwise proceed to **`grimoire-apply`** after marking tasks and manifest approved.
