---
status: complete
branch: feat/add-video-person-tags
complexity: 3
archived_at: 2026-04-28
---

# Change: Tag people in videos so `@handle` search includes them

## Why

People search via `@personHandle` exists today, but the current people/tagging flows are photo/face-centric. Users need a way to tag someone as appearing in a **video** so searching `@personHandle` returns those videos too.

## Prior art

- Search query language: `.grimoire/decisions/0002-search-query-language.md`
- Search feature baseline: `features/search/rich-search.feature`
- People baseline: `features/people/people-and-faces.feature`
- Person ↔ media association storage: `server/src/db/media-people.ts` (`image_people`)
- `@handle` evaluation (person → media ids): `server/src/services/search-service.ts`

## Non-goals

- Face detection in videos (auto-tagging) is out of scope.
- Timeline/time-range tags within a video are out of scope (this is a simple “appears in this video” tag).
- Changing the search grammar is out of scope (this only extends the media matched by existing `@handle` leaves).

## Assumptions

- `image_people` rows with **null face geometry** represent a person tagged on media without a specific face region (suitable for videos).
- The UI can present “people tagged in this media” even when the media is a video (no face boxes to render).

## Pre-mortem

- A video gets tagged, but the search results omit it due to an image-only filter somewhere (mitigation: regression unit test for `@handle` returning video ids).
- UI shows face-box affordances on videos and confuses users (mitigation: separate “tagged people” UI from face overlay tagging).

## Feature changes

| Action       | Path                                 |
| ------------ | ------------------------------------ |
| **MODIFIED** | `features/people/people-and-faces.feature` |
| **MODIFIED** | `features/search/rich-search.feature`     |

