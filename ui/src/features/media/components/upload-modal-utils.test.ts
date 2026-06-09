import { describe, expect, it } from "vitest";
import {
  buildUploadFileRows,
  getFilesToUploadAfterDecisions,
  pairConflictsWithFiles,
} from "./upload-modal-utils.js";
import { UploadNameConflict } from "@shared";

function file(name: string): File {
  return new File(["x"], name, { type: "image/jpeg" });
}

describe("pairConflictsWithFiles", () => {
  it("pairs conflicts with pending files in order per name", () => {
    const pending = [file("a.jpg"), file("a.jpg"), file("b.jpg")];
    const conflicts: UploadNameConflict[] = [
      {
        requestedName: "a.jpg",
        existing: {
          id: "1",
          originalName: "a.jpg",
          uploadedAt: "2026-01-01T00:00:00.000Z",
        },
      },
      {
        requestedName: "a.jpg",
        existing: {
          id: "2",
          originalName: "a.jpg",
          uploadedAt: "2026-01-02T00:00:00.000Z",
        },
      },
    ];
    const paired = pairConflictsWithFiles(pending, conflicts);
    expect(paired[0]).toBe(pending[0]);
    expect(paired[1]).toBe(pending[1]);
  });
});

describe("getFilesToUploadAfterDecisions", () => {
  it("drops files marked skip", () => {
    const pending = [file("a.jpg"), file("b.jpg")];
    const conflicts: UploadNameConflict[] = [
      {
        requestedName: "a.jpg",
        existing: {
          id: "1",
          originalName: "a.jpg",
          uploadedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    ];
    const result = getFilesToUploadAfterDecisions(pending, conflicts, ["skip"]);
    expect(result.map((f) => f.name)).toEqual(["b.jpg"]);
  });
});

describe("buildUploadFileRows", () => {
  it("marks conflicting files and leaves others ready", () => {
    const pending = [file("a.jpg"), file("b.jpg")];
    const conflicts: UploadNameConflict[] = [
      {
        requestedName: "a.jpg",
        existing: {
          id: "1",
          originalName: "a.jpg",
          uploadedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    ];
    const rows = buildUploadFileRows(pending, conflicts);
    expect(rows[0]?.kind).toBe("conflict");
    expect(rows[1]?.kind).toBe("ready");
  });
});
