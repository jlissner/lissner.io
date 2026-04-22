import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/media.js", () => ({
  getMediaById: vi.fn(),
  getMediaOwnerId: vi.fn(),
  listTagsForMedia: vi.fn(),
  setTagsForMedia: vi.fn(),
  listDistinctTags: vi.fn(),
}));

import * as db from "../db/media.js";
import {
  getMediaTags,
  listDistinctMediaTags,
  setMediaTags,
} from "./media-tags-service.js";

describe("media-tags-service", () => {
  beforeEach(() => {
    vi.mocked(db.getMediaById).mockReset();
    vi.mocked(db.getMediaOwnerId).mockReset();
    vi.mocked(db.listTagsForMedia).mockReset();
    vi.mocked(db.setTagsForMedia).mockReset();
    vi.mocked(db.listDistinctTags).mockReset();
  });

  it("getMediaTags returns not_found when missing", () => {
    vi.mocked(db.getMediaById).mockReturnValue(undefined);
    expect(getMediaTags("x")).toEqual({ ok: false, reason: "not_found" });
  });

  it("getMediaTags returns sorted tags", () => {
    vi.mocked(db.getMediaById).mockReturnValue({
      id: "a",
      filename: "f",
      originalName: "o",
      mimeType: "image/jpeg",
      size: 1,
      uploadedAt: "t",
    });
    vi.mocked(db.listTagsForMedia).mockReturnValue(["a", "b"]);
    expect(getMediaTags("a")).toEqual({ ok: true, tags: ["a", "b"] });
  });

  it("setMediaTags forbids non-owner non-admin", () => {
    vi.mocked(db.getMediaById).mockReturnValue({
      id: "m",
      filename: "f",
      originalName: "o",
      mimeType: "image/jpeg",
      size: 1,
      uploadedAt: "t",
    });
    vi.mocked(db.getMediaOwnerId).mockReturnValue(2);
    expect(setMediaTags("m", ["t"], { userId: 1, isAdmin: false })).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(db.setTagsForMedia).not.toHaveBeenCalled();
  });

  it("setMediaTags writes when owner matches", () => {
    vi.mocked(db.getMediaById).mockReturnValue({
      id: "m",
      filename: "f",
      originalName: "o",
      mimeType: "image/jpeg",
      size: 1,
      uploadedAt: "t",
    });
    vi.mocked(db.getMediaOwnerId).mockReturnValue(2);
    expect(setMediaTags("m", ["x"], { userId: 2, isAdmin: false })).toEqual({
      ok: true,
    });
    expect(db.setTagsForMedia).toHaveBeenCalledWith("m", ["x"]);
  });

  it("listDistinctMediaTags proxies db", () => {
    vi.mocked(db.listDistinctTags).mockReturnValue(["a"]);
    expect(listDistinctMediaTags()).toEqual(["a"]);
  });
});
