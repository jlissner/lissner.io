---
status: complete
change-id: update-directory-delete
branch: fix/update-directory-delete
created: 2026-04-28
completed: 2026-04-28
complexity: 2
---

# Update directory deletion rules (admin delete always allowed)

## Why

The directory spec and ADR previously described a special “identity person” concept where deletion is blocked for people linked to a user account. That was a drafting mistake.

Admins can delete **any** person from the directory.

## Scope

- Admin directory deletion is always allowed, including for people linked to login identity.
- Deleting a person removes their media tags and revokes login eligibility where applicable (user + refresh tokens + whitelist cleanup).

## Non-goals

- Changing authentication flows beyond the effects implied by deleting a person (e.g., session revocation behavior is not specified here).

## Artifacts

- Modified: `features/admin/people-directory.feature`
- Modified: `.grimoire/decisions/0004-unify-users-and-people.md`
