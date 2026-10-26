import { describe, it } from "vitest";

describe("Gherkin: Search indexing, activity, and manual backup (features/indexing/indexing-and-backup.feature)", () => {
  it.todo(
    "Scenario: Trigger indexing for new or changed media — see packages/server/src/routes/activity.ts and index entrypoints under packages/server/src/routes",
  );

  it.todo(
    "Scenario: See indexing progress — see packages/server/src/routes/activity.ts, global activity / job UI",
  );

  it.todo(
    "Scenario: Cancel indexing when supported — see packages/server/src/routes/activity.ts and indexing job services",
  );

  it.todo(
    "Scenario: Manual backup run — see packages/server/src/routes/backup.ts; related: packages/server/src/s3/startup-db-restore.test.ts",
  );

  it.todo(
    "Scenario: Backup status is readable — see packages/server/src/routes/backup.ts; busy shape: packages/server/src/lib/api-error.test.ts (index_in_progress)",
  );
});
