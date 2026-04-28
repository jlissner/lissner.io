---
status: draft
branch: feat/bdd-framework
complexity: 4
---

# Change: Make Gherkin specs executable (BDD test runner)

## Why

The repo already maintains a behavioral baseline in `features/**/*.feature`, but those specs are currently **not executable**. This creates a false sense of coverage: specs can drift without any failing test signal.

This change introduces a real BDD test runner and a minimal, maintainable step-definition harness so `features/` is an **actual test suite** (at least for the server/API behaviors), and CI can fail when a scenario is unimplemented.

## Prior Art (build vs buy)

- Existing tests use **Vitest** (`npm test`) and run in `node` environment (`vitest.config.ts`).
- The repo is **ESM** (`package.json` has `\"type\": \"module\"`).
- Candidate BDD runners evaluated:
  - **`@cucumber/cucumber` (cucumber-js)**: the ecosystem standard; supports ESM and TypeScript via `tsx` (`--import tsx/esm`).
  - **jest-cucumber / jest-cucumber-fusion**: tighter coupling to Jest; this repo uses Vitest.
  - **Playwright + BDD**: good for true UI E2E, but heavier; we want to start with API/service-level BDD and add E2E later if needed.

Decision: **adopt `@cucumber/cucumber`** as the BDD runner, with TypeScript step defs loaded via `tsx/esm`.

## Scope

- Add a `test:bdd` command that executes `.feature` files via Cucumber.
- Add step definition files under `features/step-definitions/` (TypeScript, ESM).
- Add a small shared world/test harness for:
  - running against **pure services** (unit-ish)
  - running against an **in-process Express app** for route-level tests (no external server)
- Configure grimoire tooling: set `.grimoire/config.yaml` `tools.bdd_test` so `grimoire check` can run the suite.

## Non-goals

- Full browser UI automation for all UI-heavy scenarios (e.g. gallery interactions). Those can be tagged/excluded initially, or implemented later with Playwright.
- Refactoring existing app code solely to make it testable (we’ll prefer route-level tests and existing service seams).

## Assumptions

- Node version supports ESM loaders needed for TS step defs (`tsx/esm` import strategy).
- We can create an Express app in-process for API BDD without needing real S3/Ollama/etc (mock/stub where necessary).

## Pre-Mortem

- Step definitions become brittle or overly coupled to UI wording → mitigate by keeping steps domain-level and mapping to stable API/service contracts.
- BDD suite becomes slow (spinning full app per scenario) → mitigate by sharing app/world per feature and using lightweight fakes.
- Unclear ownership between Vitest and Cucumber tests → mitigate by keeping `npm test` as Vitest and adding `npm run test:bdd` separately, then wiring into `validate`/`grimoire check` deliberately.

## Artifacts

| Type     | Action    | Path                                                                  |
| -------- | --------- | --------------------------------------------------------------------- |
| Decision | **ADDED** | `.grimoire/changes/bdd-framework/decisions/bdd-runner.md`             |
| Feature  | **ADDED** | `.grimoire/changes/bdd-framework/features/testing/bdd-runner.feature` |
