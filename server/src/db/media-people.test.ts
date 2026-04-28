import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  FIRST_ADMIN_EMAIL: "first-admin@example.com",
}));

vi.mock("./media-db.js", async () => {
  const { default: Database } = await import("better-sqlite3");
  const { runMediaMigrations } = await import("./media-migrations.js");
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  runMediaMigrations(db);
  return {
    getDb: () => db,
    closeMediaDb: () => {
      db.close();
    },
  };
});

import { getDb } from "./media-db.js";
import "./auth.js";
import {
  deletePersonSafe,
  resetMediaPeopleStatementCache,
} from "./media-people.js";

function insertMinimalMedia(id: string): void {
  getDb()
    .prepare(
      `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(id, `${id}.jpg`, `${id}.jpg`, "image/jpeg", 1);
}

describe("media-people delete semantics", () => {
  beforeEach(() => {
    resetMediaPeopleStatementCache();
  });

  afterAll(async () => {
    const { closeMediaDb } = await import("./media-db.js");
    closeMediaDb();
  });

  it("deletes a non-identity person and removes image_people links (tag cleanup)", () => {
    const db = getDb();
    db.prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)").run(
      1001,
      "Alice",
    );
    insertMinimalMedia("m1");
    db.prepare(
      "INSERT INTO image_people (media_id, person_id) VALUES (?, ?)",
    ).run("m1", 1001);

    expect(deletePersonSafe(1001)).toEqual({ ok: true });

    const tags = db
      .prepare("SELECT 1 FROM image_people WHERE person_id = ?")
      .all(1001) as Array<{ "1": number }>;
    expect(tags).toHaveLength(0);

    const person = db
      .prepare("SELECT 1 FROM person_names WHERE person_id = ?")
      .get(1001) as { "1": number } | undefined;
    expect(person).toBeUndefined();
  });

  it("allows delete for people linked to a user (keeps person_names while referenced)", () => {
    const db = getDb();
    db.prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)").run(
      1002,
      "Bob",
    );
    db.prepare(
      "INSERT INTO users (email, is_admin, person_id) VALUES (?, ?, ?)",
    ).run("bob@example.com", 0, 1002);

    expect(deletePersonSafe(1002)).toEqual({ ok: true });

    const person = db
      .prepare("SELECT name FROM person_names WHERE person_id = ?")
      .get(1002) as { name: string } | undefined;
    expect(person?.name).toBe("Bob");
  });
});
