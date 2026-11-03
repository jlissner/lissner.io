import { beforeEach, describe, expect, it } from "vitest";
import { execute, queryAll, queryOne } from "./client.js";
import {
  deletePersonSafe,
  resetMediaPeopleStatementCache,
} from "./media-people.js";
import { resetMediaTestDb } from "./test-media-db.js";

const insertMinimalMedia = async (id: string): Promise<void> => {
  await execute(
    `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [id, `${id}.jpg`, `${id}.jpg`, "image/jpeg", 1],
  );
};

describe("media-people delete semantics", () => {
  beforeEach(async () => {
    resetMediaPeopleStatementCache();
    await resetMediaTestDb();
  });

  it("deletes a non-identity person and removes image_people links (tag cleanup)", async () => {
    await execute("INSERT INTO person_names (person_id, name) VALUES (?, ?)", [
      1001,
      "Alice",
    ]);
    await insertMinimalMedia("m1");
    await execute(
      "INSERT INTO image_people (media_id, person_id) VALUES (?, ?)",
      ["m1", 1001],
    );

    expect(await deletePersonSafe(1001)).toEqual({ ok: true });

    const tags = await queryAll(
      "SELECT 1 FROM image_people WHERE person_id = ?",
      [1001],
    );
    expect(tags).toHaveLength(0);

    const person = await queryOne(
      "SELECT 1 FROM person_names WHERE person_id = ?",
      [1001],
    );
    expect(person).toBeUndefined();
  });

  it("allows delete for people linked to a user (keeps person_names while referenced)", async () => {
    await execute("INSERT INTO person_names (person_id, name) VALUES (?, ?)", [
      1002,
      "Bob",
    ]);
    await execute(
      "INSERT INTO users (email, is_admin, person_id) VALUES (?, ?, ?)",
      ["bob@example.com", false, 1002],
    );

    expect(await deletePersonSafe(1002)).toEqual({ ok: true });

    const person = await queryOne<{ name: string }>(
      "SELECT name FROM person_names WHERE person_id = ?",
      [1002],
    );
    expect(person?.name).toBe("Bob");
  });
});
