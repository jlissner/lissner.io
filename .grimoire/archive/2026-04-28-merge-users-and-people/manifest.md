---
status: complete
branch: feat/merge-users-and-people
complexity: 4
archived_at: 2026-04-28
---

# Change: Merge “users” and “people” into one managed directory

## Why

Define a single conceptual entity (“person”) that can optionally have account/login properties, and provide admin CRUD that manages them together with safeguards for identity and media-tag references.

## Artifacts

| Action    | Path                                                 |
| --------- | ---------------------------------------------------- |
| **ADDED** | `features/admin/people-directory.feature`            |
| **ADDED** | `.grimoire/decisions/0004-unify-users-and-people.md` |
