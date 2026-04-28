---
status: proposed
date: 2026-04-28
decision-makers: ["joe", "ai-agent"]
---

# Adopt Cucumber.js + tsx for executable Gherkin (TypeScript, ESM)

## Context and Problem Statement

This repo maintains behavioral specs in `features/**/*.feature`, but they are not executed by any test runner. As a result, specs can drift and new specs don’t provide regression protection.

The codebase is TypeScript, runs on Node, and uses ESM (`package.json` `"type": "module"`). Existing automated tests use Vitest.

We need a BDD runner that:

- Executes `.feature` files in CI with non-zero exit codes on failures
- Supports ESM + TypeScript step definitions without a build step
- Has a well-known ecosystem and maintained docs
- Can be used for API/service-level tests now, with a path to E2E later

## Decision Drivers

- ESM compatibility (no CommonJS-only assumptions)
- TypeScript support with minimal configuration
- Familiarity / ecosystem maturity
- Ability to run API tests without a browser
- Keeping maintenance burden low

## Considered Options

1. **`@cucumber/cucumber` (cucumber-js) with `tsx`**
2. Jest + a cucumber adapter (requires adopting Jest or dual runners)
3. Playwright E2E only (skips API/service-level BDD, heavier runtime)

## Decision Outcome

Chosen option: **`@cucumber/cucumber` with `tsx`**, because it’s the standard JavaScript BDD runner and supports ESM + TypeScript step definitions via `--import tsx/esm` without compiling step code ahead of time.

### Consequences

- Good:
  - `features/` becomes executable
  - Clear separation between Vitest (unit) and Cucumber (behavior)
  - Step definitions can call existing services/routes and assert outcomes
- Bad:
  - Another test runner in the toolchain
  - Some scenarios (UI-heavy) will require either tags/exclusions or later E2E infrastructure

### Cost of Ownership

- **Maintenance burden**: keep `@cucumber/cucumber` config current; maintain step defs; ensure tags prevent flaky UI scenarios from blocking CI until E2E is added.
- **Ongoing benefits**: regression coverage aligned to product behavior; specs stop drifting silently.
- **Sunset criteria**: if the repo adopts full Playwright E2E with first-class Gherkin support and Cucumber becomes redundant, revisit and potentially remove.

### Confirmation

- `npm run test:bdd` executes at least one `.feature` file and fails when a step is missing.
- `.grimoire/config.yaml` has a working `tools.bdd_test` command and `grimoire check` runs it.
