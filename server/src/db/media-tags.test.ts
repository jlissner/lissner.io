import { afterAll, describe, expect, it, vi } from "vitest";

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
import {
  getMediaIdsForTag,
  listDistinctTags,
  listTagsForMedia,
  setTagsForMedia,
} from "./media-tags.js";

function insertMinimalMedia(id: string): void {
  getDb()
    .prepare(
      `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(id, `${id}.jpg`, `${id}.jpg`, "image/jpeg", 1);
}

describe("media_tags migration and helpers", () => {
  afterAll(async () => {
    const { closeMediaDb } = await import("./media-db.js");
    closeMediaDb();
  });

  it("creates media_tags with media_id, tag, and composite primary key", () => {
    const db = getDb();
    const info = db.prepare("PRAGMA table_info(media_tags)").all() as Array<{ name: string }>;
    const names = info.map((c) => c.name).sort();
    expect(names).toContain("media_id");
    expect(names).toContain("tag");
    const pk = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='media_tags'")
      .get() as { sql: string };
    expect(pk.sql).toMatch(/PRIMARY KEY/i);
  });

  it("round-trips tags and lists distinct tags", () => {
    insertMinimalMedia("m1");
    insertMinimalMedia("m2");
    setTagsForMedia("m1", ["Beach", "summer2025"]);
    setTagsForMedia("m2", ["summer2025"]);
    expect(listTagsForMedia("m1")).toEqual(["beach", "summer2025"]);
    expect(listTagsForMedia("m2")).toEqual(["summer2025"]);
    expect(listDistinctTags()).toEqual(["beach", "summer2025"]);
    expect(getMediaIdsForTag("summer2025").sort()).toEqual(["m1", "m2"]);
  });

  it("replaces tags when set again", () => {
    insertMinimalMedia("m3");
    setTagsForMedia("m3", ["a", "b"]);
    setTagsForMedia("m3", ["c"]);
    expect(listTagsForMedia("m3")).toEqual(["c"]);
  });
});
