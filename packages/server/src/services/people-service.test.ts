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
    vi.mocked(db.getAllPersonIds).mockResolvedValue([1, 2]);
    vi.mocked(db.mergePeople).mockClear();
  });

  it("rejects merge into self", async () => {
    expect(await mergePeople(1, 1)).toEqual({
      ok: false,
      reason: "merge_into_self",
    });
    expect(db.mergePeople).not.toHaveBeenCalled();
  });

  it("rejects invalid ids", async () => {
    expect(await mergePeople(0, 1)).toEqual({
      ok: false,
      reason: "invalid_ids",
    });
    expect(await mergePeople(1, -1)).toEqual({
      ok: false,
      reason: "invalid_ids",
    });
  });

  it("rejects when a person is missing", async () => {
    vi.mocked(db.getAllPersonIds).mockResolvedValue([1]);
    expect(await mergePeople(1, 2)).toEqual({ ok: false, reason: "not_found" });
  });

  it("merges and calls db with into, from", async () => {
    expect(await mergePeople(1, 2)).toEqual({ ok: true, merged: 1, into: 2 });
    expect(db.mergePeople).toHaveBeenCalledWith(2, 1);
  });
});

describe("deletePersonById", () => {
  beforeEach(() => {
    vi.mocked(db.getAllPersonIds).mockResolvedValue([1, 2]);
    vi.mocked(db.deletePersonSafe).mockReset();
  });

  it("returns not_found when person does not exist", async () => {
    vi.mocked(db.getAllPersonIds).mockResolvedValue([2]);
    expect(await deletePersonById(1)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("returns linked_to_user when db refuses delete", async () => {
    vi.mocked(db.deletePersonSafe).mockResolvedValue({
      ok: false,
      reason: "linked_to_user",
    });
    expect(await deletePersonById(2)).toEqual({
      ok: false,
      reason: "linked_to_user",
    });
  });

  it("deletes when safe", async () => {
    vi.mocked(db.deletePersonSafe).mockResolvedValue({ ok: true });
    expect(await deletePersonById(2)).toEqual({ ok: true });
    expect(db.deletePersonSafe).toHaveBeenCalledWith(2);
  });
});
