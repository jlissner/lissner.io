---
status: approved
branch: feat/mobile-friendly
---

# Change: Replace express-session with JWT tokens and add login codes

## Why

Sessions are lost on every deployment because they're stored in-memory. Users must re-authenticate via magic link after every restart. Additionally, magic links can only be used on the device that received the email — there's no way to log in on a different device (e.g., read the email on your phone, log in on your desktop).

## Assumptions

- `SESSION_SECRET` env var is always set in production: **validated** (existing requirement, documented in HOST.md)
- SQLite write throughput is sufficient for refresh token operations: **validated** (refresh happens at most once per hour per user; family app scale)
- `jose` library works in the Docker container's Node.js version: **validated** (jose v5 requires Node 18+; project uses Node 20+)
- 1-hour access token lifetime is acceptable (a revoked user retains access for up to 1 hour): **accepted trade-off** (family app, not high-security)

## Pre-Mortem

- **Clock skew causes premature token expiry**: JWT expiry depends on server clock. Mitigation: Docker containers inherit host clock; add 30s leeway to verification.
- **Refresh token table grows unbounded**: Old tokens accumulate. Mitigation: clean up expired/revoked rows on every token creation (same pattern as `magic_link_tokens`).
- **Login code brute force**: 6-digit code has 1M combinations. Mitigation: rate-limit the verify-code endpoint (5 attempts per email per 15 minutes); codes expire in 15 minutes.
- **Silent refresh race condition**: Multiple concurrent requests trigger multiple refresh calls. Mitigation: queue concurrent requests in the UI API client; only one refresh in flight at a time.

## Feature Changes

- **ADDED** `auth/jwt-session.feature` — JWT access/refresh token lifecycle, silent refresh, logout, restart survival
- **ADDED** `auth/login-code.feature` — 6-digit login code as alternative to magic link click

## Scenarios Added

- `auth/jwt-session.feature`: "Successful login issues access and refresh tokens", "Access token authenticates API requests", "Expired access token is silently refreshed", "Refresh token is rotated on use", "Expired refresh token requires re-login", "Sessions survive server restart", "Logout revokes refresh token", "Reuse of a revoked refresh token revokes the entire token family"
- `auth/login-code.feature`: "Magic link email includes a login code", "Successful login with a valid code", "Login code rejected after expiry", "Login code rejected after use", "Wrong code is rejected", "Magic link still works alongside code", "Login code used on different device from email"

## Decisions

- **ADDED** `0001-jwt-with-refresh-tokens.md` — Replace express-session with JWT access + refresh tokens using `jose` and SQLite

## Data Changes

- **MODIFIED** `magic_link_tokens` — added `login_code` column (hashed 6-digit code)
- **ADDED** `refresh_tokens` table — stores hashed refresh tokens with family-based revocation
