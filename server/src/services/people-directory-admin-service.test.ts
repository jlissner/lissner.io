import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/auth.js", () => ({
  getUsers: vi.fn(),
  getWhitelist: vi.fn(),
  getWhitelistByEmail: vi.fn(),
  upsertWhitelistEntryByEmail: vi.fn(),
}));

vi.mock("../db/media.js", () => ({
  getAllPersonIds: vi.fn(),
  getPersonNames: vi.fn(),
  createPerson: vi.fn(),
  setPersonName: vi.fn(),
  deletePersonSafe: vi.fn(),
}));

import * as authDb from "../db/auth.js";
import * as mediaDb from "../db/media.js";
import {
  createDirectoryPerson,
  deleteDirectoryPerson,
  listDirectory,
  updateDirectoryPerson,
} from "./people-directory-admin-service.js";
import { HttpError } from "../lib/http-error.js";

describe("people-directory-admin-service", () => {
  beforeEach(() => {
    vi.mocked(mediaDb.getAllPersonIds).mockReset();
    vi.mocked(mediaDb.getPersonNames).mockReset();
    vi.mocked(mediaDb.createPerson).mockReset();
    vi.mocked(mediaDb.setPersonName).mockReset();
    vi.mocked(mediaDb.deletePersonSafe).mockReset();
    vi.mocked(authDb.getUsers).mockReset();
    vi.mocked(authDb.getWhitelist).mockReset();
    vi.mocked(authDb.getWhitelistByEmail).mockReset();
    vi.mocked(authDb.upsertWhitelistEntryByEmail).mockReset();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  it("logs create/update/delete mutations with actorUserId and personId", () => {
    vi.mocked(mediaDb.getAllPersonIds).mockReturnValue([5]);
    vi.mocked(mediaDb.getPersonNames).mockReturnValue(new Map([[5, "New"]]));
    vi.mocked(authDb.getUsers).mockReturnValue([]);
    vi.mocked(authDb.getWhitelist).mockReturnValue([]);
    vi.mocked(authDb.getWhitelistByEmail).mockReturnValue(null);
    vi.mocked(mediaDb.createPerson).mockReturnValue(5);
    vi.mocked(mediaDb.deletePersonSafe).mockReturnValue({ ok: true });

    const created = createDirectoryPerson({
      name: "New",
      actorUserId: 123,
    });
    expect(created.ok).toBe(true);

    const updated = updateDirectoryPerson({
      personId: 5,
      name: "New",
      isAdmin: false,
      actorUserId: 123,
    });
    expect(updated.ok).toBe(true);

    const deleted = deleteDirectoryPerson({ personId: 5, actorUserId: 123 });
    expect(deleted).toEqual({ ok: true, value: { deleted: 5 } });

    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        actorUserId: 123,
        personId: 5,
      }),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        actorUserId: 123,
        personId: 5,
      }),
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "delete",
        actorUserId: 123,
        personId: 5,
      }),
    );
  });

  it("rejects invalid email with stable error code", () => {
    vi.mocked(mediaDb.createPerson).mockReturnValue(5);
    vi.mocked(mediaDb.getAllPersonIds).mockReturnValue([5]);
    vi.mocked(mediaDb.getPersonNames).mockReturnValue(new Map([[5, "New"]]));
    vi.mocked(authDb.getUsers).mockReturnValue([]);
    vi.mocked(authDb.getWhitelist).mockReturnValue([]);

    try {
      createDirectoryPerson({
        name: "New",
        email: "not-an-email",
        actorUserId: 123,
      });
      throw new Error("Expected invalid email to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      const http = err as HttpError;
      expect(http.statusCode).toBe(400);
      expect(http.code).toBe("person_directory_invalid_email");
    }
  });

  it("rejects email already in use with stable error code", () => {
    vi.mocked(mediaDb.createPerson).mockReturnValue(5);
    vi.mocked(mediaDb.getAllPersonIds).mockReturnValue([5]);
    vi.mocked(mediaDb.getPersonNames).mockReturnValue(new Map([[5, "New"]]));
    vi.mocked(authDb.getUsers).mockReturnValue([
      {
        id: 1,
        email: "used@example.com",
        isAdmin: false,
        createdAt: "t",
        personId: 99,
      },
    ]);
    vi.mocked(authDb.getWhitelist).mockReturnValue([]);

    try {
      createDirectoryPerson({
        name: "New",
        email: "used@example.com",
        actorUserId: 123,
      });
      throw new Error("Expected email-in-use to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      const http = err as HttpError;
      expect(http.statusCode).toBe(409);
      expect(http.code).toBe("person_directory_email_in_use");
    }
  });

  it("combines person-only, whitelist, and identity people into a flattened directory", () => {
    vi.mocked(mediaDb.getAllPersonIds).mockReturnValue([1, 2, 3]);
    vi.mocked(mediaDb.getPersonNames).mockReturnValue(
      new Map([
        [1, "Alice"],
        [2, "Bob"],
        [3, "Carol"],
      ]),
    );

    vi.mocked(authDb.getUsers).mockReturnValue([
      {
        id: 10,
        email: "carol@example.com",
        isAdmin: false,
        createdAt: "t",
        personId: 3,
      },
    ]);

    vi.mocked(authDb.getWhitelist).mockReturnValue([
      {
        id: 100,
        email: "orphan@example.com",
        isAdmin: false,
        invitedAt: "t",
        personId: null,
      },
      {
        id: 200,
        email: "bob@example.com",
        isAdmin: false,
        invitedAt: "t",
        personId: 2,
      },
    ]);

    const result = listDirectory();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value).toEqual([
      {
        personId: 1,
        name: "Alice",
        email: null,
        canLogin: false,
        isAdmin: false,
        isIdentity: false,
        whitelistEntryId: null,
      },
      {
        personId: 2,
        name: "Bob",
        email: "bob@example.com",
        canLogin: true,
        isAdmin: false,
        isIdentity: false,
        whitelistEntryId: 200,
      },
      {
        personId: 3,
        name: "Carol",
        email: "carol@example.com",
        canLogin: true,
        isAdmin: false,
        isIdentity: true,
        whitelistEntryId: null,
      },
    ]);
  });

  it("prefers identity email and merges admin status when both user and whitelist exist", () => {
    vi.mocked(mediaDb.getAllPersonIds).mockReturnValue([3]);
    vi.mocked(mediaDb.getPersonNames).mockReturnValue(new Map([[3, "Carol"]]));

    vi.mocked(authDb.getUsers).mockReturnValue([
      {
        id: 10,
        email: "carol@example.com",
        isAdmin: false,
        createdAt: "t",
        personId: 3,
      },
    ]);

    vi.mocked(authDb.getWhitelist).mockReturnValue([
      {
        id: 300,
        email: "carol@example.com",
        isAdmin: true,
        invitedAt: "t",
        personId: 3,
      },
    ]);

    const result = listDirectory();
    expect(result).toEqual({
      ok: true,
      value: [
        {
          personId: 3,
          name: "Carol",
          email: "carol@example.com",
          canLogin: true,
          isAdmin: true,
          isIdentity: true,
          whitelistEntryId: 300,
        },
      ],
    });
  });
});
