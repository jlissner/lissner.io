---
status: accepted
date: 2026-04-29
decision-makers: []
---

# Face matching quality: detection, clustering, and merge confirmation

## Context and Problem Statement

Face-related behavior depends on a single pipeline: detect faces in images (`@vladmandic/human`), cluster embeddings into placeholder people at index time, then suggest merges of placeholders to named people using embedding similarity. Users report missed faces, false face regions, and incorrect automatic matches—including merges that should have stayed in review.

**Product stance (approved draft):** merging a placeholder into a named person **always** requires explicit user confirmation; there is **no** silent automatic merge based on similarity alone. Questionable face regions may appear but must be **marked as low confidence**, and **every** face region must be **dismissible**.

**Operational stance:** **Re-indexing** the library (re-running the indexing pipeline on existing media) is an **admin-only** capability; the feature spec defines observable outcomes when re-index completes.

## Decision Drivers

- **Precision**: Avoid presenting false faces as high-confidence; avoid wrong merges (especially lookalike family members).
- **Recall**: Keep detecting faces that are obvious to humans (size, pose, lighting variations).
- **User control**: Users must confirm any identity merge; users must be able to dismiss any proposed face region.
- **Operability**: Prefer changes that fit the existing Node/tfjs deployment without mandatory GPU for baseline behavior.
- **Testability**: Improvements must be verifiable with automated checks (golden fixtures and/or deterministic subtests).
- **Governance**: Re-index is powerful; restrict to admins and document effects on search and tags.

## Considered Options

1. **Threshold and pipeline tuning only** — Adjust Human detector settings (if applicable), clustering similarity, suggestion floors, and descriptor sampling; add confidence labeling and dismiss actions in the UI; remove or bypass any server path that merges without confirmation.
2. **Algorithm change on the same library** — Replace greedy single-pass clustering with a more stable clustering approach, or aggregate embeddings differently before compare; keep Human for detect+embed.
3. **Replace face stack** — Swap to another detector/embedder (different package or native binary), with new similarity metric and calibration.
4. **Hybrid (recommended starting point)** — Ship (1)–(2) with fixtures and always-confirm merges; revisit (3) only if acceptance criteria are still missed.

## Decision Outcome

Chosen option: **Hybrid (4)** with **mandatory confirmation for all placeholder-to-named merges** and **admin-only full library re-index** whose outcomes are specified in Gherkin (`admin-library-reindex.feature`).

### Consequences

- Good: Wrong silent merges eliminated; admins can refresh embeddings and auto face tags after pipeline upgrades; manual work is explicit and traceable.
- Bad: Every duplicate resolution requires a click (or equivalent); review queues may stay larger than with aggressive auto-merge.
- Neutral: Low-confidence UI and dismiss actions add UI surface area; re-index must be protected by admin authorization in API and UI.

### Cost of Ownership

- **Maintenance burden**: Fixture set; threshold and confidence mapping docs; admin auth tests for re-index.
- **Ongoing benefits**: Safer identity data; path to improve detector without re-upload.
- **Sunset criteria**: Revisit if users overwhelmingly request optional auto-merge under strict policy (would be a new decision).

### Confirmation

- Cucumber scenarios in `face-matching-quality.feature` and `admin-library-reindex.feature` pass with agreed fixtures and role setup.
- Manual spot-check on a private library: fewer mistaken merges, dismissible regions, admin-only re-index enforced.
