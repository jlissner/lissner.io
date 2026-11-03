import { beforeEach, describe, expect, it } from "vitest";
import { execute, queryOne, withTransaction } from "./client.js";
import { resetMediaTestDb } from "./test-media-db.js";

describe("withTransaction concurrency", () => {
  beforeEach(async () => {
    await resetMediaTestDb();
  });

  it("keeps the pool queryable after concurrent transactions finish", async () => {
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        withTransaction(async () => {
          await execute(
            `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [`c${i}`, `c${i}.jpg`, `c${i}.jpg`, "image/jpeg", 1],
          );
        }),
      ),
    );

    const row = await queryOne<{ n: string }>(
      "SELECT COUNT(*)::text AS n FROM media",
    );
    expect(row?.n).toBe("20");
  });

  it("isolates concurrent transaction clients from each other", async () => {
    const results = await Promise.all(
      ["a", "b", "c"].map((id) =>
        withTransaction(async () => {
          await execute(
            `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [id, `${id}.jpg`, `${id}.jpg`, "image/jpeg", 1],
          );
          return queryOne<{ id: string }>("SELECT id FROM media WHERE id = ?", [
            id,
          ]);
        }),
      ),
    );

    expect(results.map((r) => r?.id).sort()).toEqual(["a", "b", "c"]);
  });
});
