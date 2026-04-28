---
status: accepted
date: 2026-04-28
decision-makers: []
---

# Unify “users” (accounts) and “people” (taggable identities) as one directory concept

## Context and Problem Statement

The system currently has:

- **People** (`person_names`, `image_people`) for tagging/searching
- **Users** (`users`, `auth_whitelist`, `refresh_tokens`) for authentication

But users and people are already linked (`users.person_id`), and the admin UI exposes “Users & People” together while still requiring admins to reason about multiple tables/flows (people CRUD vs whitelist vs user list).

We need one conceptual model: a **person directory** where some people can log in and others cannot yet, while keeping safety around deletion/merge in the presence of references (media tags, auth identity).

## Decision Drivers

- Admins manage the family directory in one place
- People can exist before they have accounts
- Safe deletion/merge rules when a person is referenced by media or auth
- Minimize auth churn (keep JWT/refresh design stable)
- Avoid over-migration: prefer incremental changes with clear upgrade path

## Considered Options

1. **Status quo**: keep concepts split; add more UI hints and docs
2. **Conceptual unification (API/UI)**: keep current tables, but provide a single admin CRUD surface and rules that operate across people + whitelist + users
3. **Full schema merge**: replace `users`/`person_names` with a single `people` table holding both identity and display info; migrate all references

## Decision Outcome

Chosen option: **Option 2 — Conceptual unification at the API/UI level**, because it delivers the “managed together” admin experience quickly, preserves the existing auth design, and avoids a risky migration that could invalidate sessions or break foreign key relationships.

This ADR explicitly keeps the door open to Option 3 later if the current split becomes a maintenance burden.

### Consequences

- Good: Admins see one directory and CRUD against it; consistent safeguards enforced server-side
- Good: No immediate auth/session migration required
- Bad: Tables remain split; developers must still understand the underlying storage split

### Cost of Ownership

- **Maintenance burden**: some “directory” service logic must coordinate between people + whitelist + users; requires tests for deletion/merge safeguards.
- **Ongoing benefits**: fewer admin footguns; less conceptual overhead for operators; fewer production issues like FK failures on delete.
- **Sunset criteria**: revisit for Option 3 if admin CRUD keeps growing and the split tables cause repeated bugs or duplicated rules.

### Confirmation

- Admin can create/update/delete a person from one screen, including account-related fields (email/whitelist/admin) when applicable.
- Deleting an identity person is blocked with a stable error code; deleting a tagged (non-identity) person is allowed and removes their `image_people` tags.
- Existing login flows continue to work without change.
