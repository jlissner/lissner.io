---
status: accepted
date: 2026-04-21
decision-makers: []
---

# Search query language for tags, people, and semantic text

## Context and Problem Statement

Search today combines substring person-name matching with a single embedding over the full query string. Users need explicit `#tag` and `@personHandle` tokens, parentheses, and `AND` / `OR` to compose queries without relying on the embedding to guess intent.

## Decision Drivers

- Predictable behavior for `#`, `@`, and boolean operators
- SQLite-friendly filtering for tags and people
- Minimal new surface area: reuse existing embeddings pipeline for free-text spans

## Considered Options

1. **Full-text query string only** — keep a single string; improve embedding prompts only
2. **Structured JSON API** — client sends AST; no user-facing string grammar
3. **String grammar with parser** — user types expressions; server parses to AST and evaluates

## Decision Outcome

Chosen option: **String grammar with parser**, because it matches the user-facing example and keeps a single `q` parameter.

Grammar (v1):

- **Terms**: `#identifier` (tag), `@identifier` (person handle), or **free text** (semantic; one or more words; semantic term is the concatenation of free-text tokens in order)
- **Operators**: `AND`, `OR` (case-insensitive), parentheses `(` `)`
- **Precedence**: `OR` binds looser than `AND` (use explicit parens for clarity; document equivalence to `(A AND B) OR C` parsing rules in parser tests)

**Evaluation order**

1. Parse to AST; reject invalid input with 400 and stable error code.
2. For each leaf: resolve `#tag` to media id set; `@handle` to media ids for matching person; free text to ranked ids from existing cosine similarity (cap as today, e.g. top 20) against **only the free-text span** (not the full query string with `#`/`@`).
3. Combine sets with `AND` = intersection, `OR` = union.
4. If the AST has non-text leaves combined with text: **intersect** final boolean media set with embedding top set when free text is present; if only free text, behavior matches current semantic search.

### Consequences

- Good: User-visible language matches mental model; tags and people are exact filters
- Bad: Parser maintenance; must keep error messages usable

### Cost of Ownership

- **Maintenance burden**: Parser + migration for tags; new tests for grammar edge cases
- **Ongoing benefits**: Clear extension point (`NOT`, quoting) without API churn
- **Sunset criteria**: Revisit if we move search to a dedicated engine (e.g. Postgres full-text + pgvector) — parser could emit SQL or RPC instead of set logic

### Confirmation

- Parser unit tests cover precedence and errors
- At least one integration-style test builds SQLite state and asserts search results for a mixed query
