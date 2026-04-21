---
status: proposed
date: 2026-04-20
decision-makers: [Joe]
---

# Replace express-session with JWT access + refresh tokens

## Context and Problem Statement

The app uses `express-session` with the default in-memory `MemoryStore`. Every deployment or server restart loses all sessions, forcing every user to re-authenticate via magic link. This is a poor experience for a family app where deployments happen regularly.

We need sessions that survive restarts while keeping the auth model simple and self-contained (no Redis, no external session store).

## Decision Drivers

- Sessions must survive server restarts and deployments
- Must work with the existing SQLite database (no new infrastructure)
- Must support the existing magic link login flow
- Must support immediate session revocation (logout, security events)
- Minimize new dependencies

## Considered Options

1. **JWT access token (1h) + refresh token (7d) in httpOnly cookies, refresh tokens stored in SQLite**
2. **`express-session` with `better-sqlite3-session-store`** — persist sessions to the existing SQLite DB
3. **`express-session` with `connect-redis`** — persist sessions to Redis
4. **Stateless JWTs only (no refresh token, no server-side storage)**

## Decision Outcome

Chosen option: **Option 1 — JWT access + refresh tokens with SQLite-backed refresh token storage**, because it provides restart-surviving sessions without adding infrastructure, keeps per-request auth stateless (no DB lookup for access tokens), and allows immediate revocation via the refresh token table.

Option 2 (SQLite session store) would be simpler but still requires a DB lookup on every request. Option 3 adds Redis as a dependency we don't need at this scale. Option 4 (stateless only) prevents session revocation on logout.

### Token Design

| Token         | Lifetime | Storage                                                                                    | Verification                 |
| ------------- | -------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| Access token  | 1 hour   | httpOnly cookie `access_token`                                                             | Signature check only (no DB) |
| Refresh token | 7 days   | httpOnly cookie `refresh_token` (path `/api/auth`); SHA-256 hash in `refresh_tokens` table | DB lookup + signature check  |

**Library: `jose`** — zero-dependency, async, TypeScript-native, Web Crypto API. Preferred over `jsonwebtoken` which is legacy and sync-only.

**Signing: HMAC-SHA256 (HS256)** using the existing `SESSION_SECRET` env var (renamed conceptually to also serve as JWT secret). Separate secrets for access and refresh tokens derived by appending a fixed suffix.

**Refresh token rotation:** Every refresh issues a new refresh token and invalidates the old one. Tokens are grouped by a `family_id`; reuse of an already-rotated token revokes the entire family (detects token theft).

### Consequences

- Good: Sessions survive restarts — no more forced re-login after deploys
- Good: Per-request auth is stateless (just verify JWT signature + expiry)
- Good: Immediate revocation via refresh token table
- Good: No new infrastructure (uses existing SQLite)
- Bad: More complex than express-session (refresh rotation, silent refresh on the client)
- Bad: 1-hour window where a revoked user's access token is still valid (acceptable trade-off)

### Cost of Ownership

- **Maintenance burden**: `jose` is a stable, zero-dependency library — low maintenance. The `refresh_tokens` table needs periodic cleanup of expired rows (same pattern as `magic_link_tokens`). Client-side silent refresh adds ~30 lines to the API client.
- **Ongoing benefits**: Zero-downtime deploys become invisible to users. No session store to manage or scale.
- **Sunset criteria**: Revisit if the app moves to a multi-service architecture where a dedicated auth service or OAuth2 provider makes more sense.

### Confirmation

Verify by: deploying the server, confirming a logged-in user remains authenticated after restart, confirming logout immediately prevents new access token issuance.
