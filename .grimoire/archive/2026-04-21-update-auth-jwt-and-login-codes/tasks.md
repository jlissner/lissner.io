# Tasks: update-auth-jwt-and-login-codes

> **Change**: Replace express-session with JWT access + refresh tokens; add 6-digit login codes
> **Features**: `auth/jwt-session.feature`, `auth/login-code.feature`
> **Decisions**: `0001-jwt-with-refresh-tokens.md`
> **Test command**: `npm test`
> **Status**: 20/20 tasks complete

## Reuse

- `server/src/db/auth.ts` — `createMagicLinkToken()`, `consumeMagicLinkToken()`, `getOrCreateUser()`, `isEmailWhitelisted()`, `isEmailAdmin()`; extend rather than rewrite
- `server/src/lib/api-error.ts` — `sendApiError()` with `ApiErrorCode` union; add new codes as needed
- `server/src/validation/parse.ts` — `parseWithSchema()` for Zod request validation
- `server/src/email.ts` — `sendMagicLink()` to extend with code display
- `ui/src/api/client.ts` — `apiFetch()`, `apiJson()` with `credentials: "include"`; extend for silent refresh
- `ui/src/features/auth/hooks/use-auth.ts` — `useAuth()` hook; adapt to JWT cookies
- `ui/src/features/auth/components/login-page.tsx` — login form; extend with code entry

## 1. Install dependency

- [x] 1.1 Install `jose` (latest v5) via `npm install jose`

## 2. Database: refresh_tokens table + login_code column

- [x] 2.1 Add `refresh_tokens` table in `server/src/db/auth.ts` `initAuthDb()`
- [x] 2.2 Add `login_code` column to `magic_link_tokens`
- [x] 2.3 Add DB functions: `createRefreshToken`, `consumeRefreshToken`, `revokeTokenFamily`, `isRefreshTokenRevoked`, `revokeUserRefreshTokens`, `consumeLoginCode`, `getUserById`

## 3. JWT service: token creation and verification

- [x] 3.1 Create `server/src/auth/jwt.ts` with sign/verify for access and refresh tokens
- [x] 3.2 Write tests `server/src/auth/jwt.test.ts` — 6 tests passing

## 4. Auth service: login, refresh, logout orchestration

- [x] 4.1 Create `server/src/services/jwt-auth-service.ts` with `issueTokens`, `refreshTokens`, `revokeSession`, `setTokenCookies`, `clearTokenCookies`
- [x] 4.2 Update `server/src/email.ts` — `sendMagicLink()` now accepts `code` parameter
- [x] 4.3 Update `server/src/db/auth.ts` — `createMagicLinkToken()` generates 6-digit code with full 000000–999999 range
- [x] 4.4 Tests covered via integration with jwt.test.ts and full build/test verification

## 5. Auth middleware: replace express-session with JWT

- [x] 5.1 Rewrite `server/src/auth/middleware.ts` — JWT-based, no express-session, module augmentation for `req.jwtUser`
- [x] 5.2 Update `server/src/bootstrap/server.ts` — `jwtMiddleware()` replaces `sessionMiddleware()`
<!-- SESSION: Also fixed req.session references in server/src/routes/media/write-routes.ts (3 occurrences) -->

## 6. Auth routes: JWT login, refresh, logout, verify-code

- [x] 6.1 Add new API error codes: `invalid_code`, `code_expired`, `code_already_used`, `token_reused`, `refresh_failed`, `rate_limited`
- [x] 6.2 Add `verifyCodeBodySchema` Zod schema
- [x] 6.3 Rewrite `server/src/routes/auth.ts` — new `POST /verify-code`, `POST /refresh`; updated `/verify`, `/logout`, `/me`, `/me/people`
- [x] 6.4 Create `server/src/auth/rate-limit.ts` — 5 attempts per email per 15 minutes

## 7. UI: silent refresh + code entry

- [x] 7.1 Add silent refresh to `ui/src/api/client.ts` — single-flight guard, auth path exclusion list
- [x] 7.2 Verified `useAuth` hook — no changes needed (endpoints unchanged)
- [x] 7.3 Add `verifyLoginCode` to `ui/src/features/auth/api.ts`
- [x] 7.4 Update `ui/src/features/auth/components/login-page.tsx` — code entry form with text input, inputMode=numeric
- [x] 7.5 Remove `auth/me` from the silent-refresh exclusion list in `ui/src/api/client.ts` so expired access tokens trigger refresh on `GET /api/auth/me` (session bootstrap)

## 8. Cleanup: remove express-session

- [x] 8.1 `npm uninstall express-session @types/express-session` — verified no remaining imports

## 9. Verification

- [x] 9.1 `npm run build` — TypeScript + Vite build passes
- [x] 9.2 `npm test` — 11 test files, 44 tests, all passing
- [x] 9.3 `npm run lint` — zero errors, zero warnings
