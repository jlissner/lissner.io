import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execute } from "./client.js";
import { getMediaById } from "./media-read.js";
import {
  linkMotionPairForMedia,
  relinkAllMotionPairs,
  resetMediaMotionStatementCache,
} from "./media-motion.js";
import { resetMediaTestDb } from "./test-media-db.js";

const insertMedia = async (id: string, originalName: string): Promise<void> => {
  await execute(
    `INSERT INTO media (id, filename, original_name, mime_type, size, uploaded_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [id, originalName, originalName, "image/jpeg", 1],
  );
};

describe("media-motion / getMediaById aliases", () => {
  beforeEach(async () => {
    resetMediaMotionStatementCache();
    await resetMediaTestDb();
  });

  it("getMediaById SQL quotes camelCase aliases for Postgres", () => {
    const src = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "media-read.ts"),
      "utf8",
    );
    expect(src).toContain('original_name as "originalName"');
    expect(src).toMatch(/getMediaById[\s\S]*?original_name as "originalName"/);
    expect(src).not.toMatch(
      /getMediaById[\s\S]*?original_name as originalName[^"]/,
    );
  });

  it("getMediaById returns originalName for motion pairing", async () => {
    await insertMedia("still", "clip.mp.jpg");
    const row = await getMediaById("still");
    expect(row?.originalName).toBe("clip.mp.jpg");
  });

  it("linkMotionPairForMedia does not throw when originalName is present", async () => {
    await insertMedia("still", "clip.mp.jpg");
    await insertMedia("video", "clip.mp");
    await expect(linkMotionPairForMedia("still")).resolves.toBeUndefined();
    await expect(relinkAllMotionPairs()).resolves.toBeUndefined();
  });
});
