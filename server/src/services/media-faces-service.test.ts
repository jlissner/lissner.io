import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/media.js", () => ({
  getMediaById: vi.fn(),
  getAllPersonIds: vi.fn(),
  addPersonToMediaNoBox: vi.fn(),
  createNewPerson: vi.fn(),
  addPersonToMedia: vi.fn(),
}));

import * as db from "../db/media.js";
import { addPersonToMediaTag } from "./media-faces-service.js";

describe("addPersonToMediaTag (video tagging)", () => {
  beforeEach(() => {
    vi.mocked(db.getMediaById).mockReset();
    vi.mocked(db.getAllPersonIds).mockReset();
    vi.mocked(db.addPersonToMediaNoBox).mockReset();
    vi.mocked(db.createNewPerson).mockReset();
    vi.mocked(db.addPersonToMedia).mockReset();
  });

  it("video + missing personId + createNew false → person_required", () => {
    vi.mocked(db.getMediaById).mockReturnValue({
      id: "m1",
      mimeType: "video/mp4",
      originalName: "m1.mp4",
    } as never);

    expect(
      addPersonToMediaTag({
        mediaId: "m1",
        personId: undefined,
        box: undefined,
        createNew: false,
      }),
    ).toEqual({ ok: false, reason: "person_required" });
  });

  it("video + personId unknown → person_not_found", () => {
    vi.mocked(db.getMediaById).mockReturnValue({
      id: "m1",
      mimeType: "video/mp4",
      originalName: "m1.mp4",
    } as never);
    vi.mocked(db.getAllPersonIds).mockReturnValue([1, 2]);

    expect(
      addPersonToMediaTag({
        mediaId: "m1",
        personId: 3,
        box: undefined,
        createNew: false,
      }),
    ).toEqual({ ok: false, reason: "person_not_found" });
  });

  it("video + personId known → ok true; calls addPersonToMediaNoBox(mediaId, personId)", () => {
    vi.mocked(db.getMediaById).mockReturnValue({
      id: "m1",
      mimeType: "video/mp4",
      originalName: "m1.mp4",
    } as never);
    vi.mocked(db.getAllPersonIds).mockReturnValue([2, 3]);

    expect(
      addPersonToMediaTag({
        mediaId: "m1",
        personId: 2,
        box: undefined,
        createNew: false,
      }),
    ).toEqual({ ok: true, personId: 2, created: "existing" });
    expect(db.addPersonToMediaNoBox).toHaveBeenCalledWith("m1", 2);
    expect(db.addPersonToMedia).not.toHaveBeenCalled();
  });

  it("video + createNew true → ok true; calls createNewPerson and addPersonToMediaNoBox with new id", () => {
    vi.mocked(db.getMediaById).mockReturnValue({
      id: "m1",
      mimeType: "video/mp4",
      originalName: "m1.mp4",
    } as never);
    vi.mocked(db.createNewPerson).mockReturnValue(9);

    expect(
      addPersonToMediaTag({
        mediaId: "m1",
        personId: undefined,
        box: undefined,
        createNew: true,
      }),
    ).toEqual({ ok: true, personId: 9, created: "new" });
    expect(db.createNewPerson).toHaveBeenCalledTimes(1);
    expect(db.addPersonToMediaNoBox).toHaveBeenCalledWith("m1", 9);
  });
});
