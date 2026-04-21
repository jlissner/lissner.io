---
status: draft
branch: feat/better-search
---

# Change: Rich search with custom tags and @person query syntax

## Why

Users need to organize media with custom tags and combine tag, people, and semantic (embedding) terms in one expressive query—for example `(#summer2025 OR #summer2024) AND @joeLissner AND water`.

## Assumptions

- **Embeddings stay Ollama-based**: Semantic terms still use existing `nomic-embed-text` flow; no new model without an ADR.
- **Person match via handle**: `@name` resolves by normalizing each person’s display name to a handle (lowercase, strip non-alphanumeric), matching `@token` with the same normalization—no separate “username” column unless we hit ambiguity (unvalidated).
- **Tags are user-defined strings**: Stored normalized for matching; display can use the first-seen casing or a single canonical string per tag (unvalidated—pick simplest in implementation).
- **SQLite remains the store**: One new table for media↔tag links; migrations follow `media-migrations.ts` patterns.

## Pre-Mortem

- **Parser edge cases confuse users**: Mitigation—document supported grammar; return clear 400 with parse errors for invalid queries; unit-test tokenizer/parser heavily.
- **Boolean + embedding is slow**: Mitigation—restrict embedding pass to the candidate set after tag/person filters when those exist; document accepted risk when query is only free text (accepted: same as today).
- **Handle collisions** (two “Jane Doe” patterns): Mitigation—document that @handle may be ambiguous; optional follow-up to add unique handles (accepted for v1: deterministic tie-break by lowest `person_id` + log in dev if needed).

## Feature Changes

- **ADDED** `search/rich-search.feature` — Tag management, search grammar, API behavior

## Scenarios Added

- See `features/search/rich-search.feature`

## Scenarios Modified

- none (baseline has no search feature file)

## Decisions

- **ADDED** `0001-search-query-language.md` — Boolean query grammar, tag storage, evaluation order
