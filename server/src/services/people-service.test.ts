import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/media.js", () => ({
  getAllPersonIds: vi.fn(),
  deletePersonSafe: vi.fn(),
  mergePeople: vi.fn(),
}));

import * as db from "../db/media.js";
import { deletePersonById, mergePeople } from "./people-service.js";

describe("mergePeople", () => {
  beforeEach(() => {
    vi.mocked(db.getAllPersonIds).mockReturnValue([1, 2]);
    vi.mocked(db.mergePeople).mockClear();
  });

  it("rejects merge into self", () => {
    expect(mergePeople(1, 1)).toEqual({ ok: false, reason: "merge_into_self" });
    expect(db.mergePeople).not.toHaveBeenCalled();
  });

  it("rejects invalid ids", () => {
    expect(mergePeople(0, 1)).toEqual({ ok: false, reason: "invalid_ids" });
    expect(mergePeople(1, -1)).toEqual({ ok: false, reason: "invalid_ids" });
  });

  it("rejects when a person is missing", () => {
    vi.mocked(db.getAllPersonIds).mockReturnValue([1]);
    expect(mergePeople(1, 2)).toEqual({ ok: false, reason: "not_found" });
  });

  it("merges and calls db with into, from", () => {
    expect(mergePeople(1, 2)).toEqual({ ok: true, merged: 1, into: 2 });
    expect(db.mergePeople).toHaveBeenCalledWith(2, 1);
  });
});

describe("deletePersonById", () => {
  beforeEach(() => {
    vi.mocked(db.getAllPersonIds).mockReturnValue([1, 2]);
    vi.mocked(db.deletePersonSafe).mockReset();
  });

  it("returns not_found when person does not exist", () => {
    vi.mocked(db.getAllPersonIds).mockReturnValue([2]);
    expect(deletePersonById(1)).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns linked_to_user when db refuses delete", () => {
    vi.mocked(db.deletePersonSafe).mockReturnValue({
      ok: false,
      reason: "linked_to_user",
    });
    expect(deletePersonById(2)).toEqual({ ok: false, reason: "linked_to_user" });
  });

  it("deletes when safe", () => {
    vi.mocked(db.deletePersonSafe).mockReturnValue({ ok: true });
    expect(deletePersonById(2)).toEqual({ ok: true });
    expect(db.deletePersonSafe).toHaveBeenCalledWith(2);
  });
});
