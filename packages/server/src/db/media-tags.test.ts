import { beforeEach, describe, expect, it } from "vitest";
import { execute, queryAll } from "./client.js";
import {
  getMediaIdsForTag,
  listDistinctTags,
  listTagsForMedia,
  setTagsForMedia,
  addTagsForMedia,
  removeTagsFromMedia,
} from "./media-tags.js";
import { resetMediaTestDb } from "./test-media-db.js";

const insertMinimalMedia = async (id: string): Promise<void> => {
  await execute(
    `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [id, `${id}.jpg`, `${id}.jpg`, "image/jpeg", 1],
  );
};

describe("media_tags helpers", () => {
  beforeEach(async () => {
    await resetMediaTestDb();
  });

  it("has media_tags with media_id and tag columns", async () => {
    const cols = await queryAll<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'media_tags'
       ORDER BY column_name`,
    );
    const names = cols.map((c) => c.column_name);
    expect(names).toContain("media_id");
    expect(names).toContain("tag");
  });

  it("round-trips tags and lists distinct tags", async () => {
    await insertMinimalMedia("m1");
    await insertMinimalMedia("m2");
    await setTagsForMedia("m1", ["Beach", "summer2025"]);
    await setTagsForMedia("m2", ["summer2025"]);
    expect(await listTagsForMedia("m1")).toEqual(["beach", "summer2025"]);
    expect(await listTagsForMedia("m2")).toEqual(["summer2025"]);
    expect(await listDistinctTags()).toEqual(["beach", "summer2025"]);
    expect((await getMediaIdsForTag("summer2025")).sort()).toEqual([
      "m1",
      "m2",
    ]);
  });

  it("replaces tags when set again", async () => {
    await insertMinimalMedia("m3");
    await setTagsForMedia("m3", ["a", "b"]);
    await setTagsForMedia("m3", ["c"]);
    expect(await listTagsForMedia("m3")).toEqual(["c"]);
  });

  it("adds tags without removing existing ones", async () => {
    await insertMinimalMedia("m4");
    await setTagsForMedia("m4", ["beach"]);
    await addTagsForMedia("m4", ["Summer", "beach"]);
    expect(await listTagsForMedia("m4")).toEqual(["beach", "summer"]);
  });

  it("removes specific tags without clearing others", async () => {
    await insertMinimalMedia("m5");
    await setTagsForMedia("m5", ["beach", "summer", "trip"]);
    await removeTagsFromMedia("m5", ["Summer"]);
    expect(await listTagsForMedia("m5")).toEqual(["beach", "trip"]);
  });
});
