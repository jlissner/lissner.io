import { afterAll, describe, expect, it, vi } from "vitest";

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
import {
  createRefreshToken,
  deleteRefreshTokensByUserIds,
  deleteUsersByPersonId,
  deleteWhitelistByPersonId,
  getOrCreateUser,
  getUserIdsByPersonId,
  getWhitelistByEmail,
  updateWhitelistEntry,
  upsertWhitelistEntryByEmail,
} from "./auth.js";

describe("auth db whitelist helpers", () => {
  afterAll(async () => {
    const { closeMediaDb } = await import("./media-db.js");
    closeMediaDb();
  });

  it("upserts whitelist entries by email and reads them back", () => {
    getDb()
      .prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)")
      .run(123, "P123");
    getDb()
      .prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)")
      .run(456, "P456");

    const id1 = upsertWhitelistEntryByEmail({
      email: "Test@Example.com",
      isAdmin: false,
      personId: 123,
      invitedByUserId: 999,
    });
    expect(id1).toBeGreaterThan(0);

    const row1 = getWhitelistByEmail("test@example.com");
    expect(row1).toEqual(
      expect.objectContaining({
        id: id1,
        email: "test@example.com",
        isAdmin: false,
        invitedByUserId: 999,
        personId: 123,
      }),
    );

    const id2 = upsertWhitelistEntryByEmail({
      email: "test@example.com",
      isAdmin: true,
      personId: 456,
    });
    expect(id2).toBe(id1);

    const row2 = getWhitelistByEmail("TEST@example.com");
    expect(row2).toEqual(
      expect.objectContaining({
        id: id1,
        email: "test@example.com",
        isAdmin: true,
        invitedByUserId: 999,
        personId: 456,
      }),
    );
  });

  it("updates whitelist entries without clobbering fields unless provided", () => {
    getDb()
      .prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)")
      .run(2001, "P2001");

    const id = upsertWhitelistEntryByEmail({
      email: "update-me@example.com",
      isAdmin: false,
      personId: 2001,
      invitedByUserId: 7,
    });

    expect(updateWhitelistEntry(id, { isAdmin: true })).toBe(true);
    expect(getWhitelistByEmail("update-me@example.com")).toEqual(
      expect.objectContaining({
        id,
        isAdmin: true,
        invitedByUserId: 7,
        personId: 2001,
      }),
    );

    expect(updateWhitelistEntry(id, { personId: null })).toBe(true);
    expect(getWhitelistByEmail("update-me@example.com")).toEqual(
      expect.objectContaining({
        id,
        isAdmin: true,
        invitedByUserId: 7,
        personId: null,
      }),
    );
  });

  it("returns false when updateWhitelistEntry is given no fields", () => {
    const id = upsertWhitelistEntryByEmail({
      email: "no-fields@example.com",
      isAdmin: false,
      personId: null,
    });
    expect(updateWhitelistEntry(id, {})).toBe(false);
  });

  it("creates the default first-admin user and whitelist entry on init", () => {
    const row = getDb()
      .prepare("SELECT email FROM users WHERE LOWER(email) = ?")
      .get("first-admin@example.com") as { email: string } | undefined;
    expect(row?.email).toBe("first-admin@example.com");

    const wl = getWhitelistByEmail("first-admin@example.com");
    expect(wl?.email).toBe("first-admin@example.com");
  });

  it("getUserIdsByPersonId returns empty when none", () => {
    expect(getUserIdsByPersonId(999999)).toEqual([]);
  });

  it("deleteRefreshTokensByUserIds removes rows for the given user ids", () => {
    const { id: userId } = getOrCreateUser("refresh@example.com", false);
    createRefreshToken(
      "token-a",
      userId,
      "fam",
      new Date(Date.now() + 60_000).toISOString(),
    );
    createRefreshToken(
      "token-b",
      userId,
      "fam",
      new Date(Date.now() + 60_000).toISOString(),
    );

    const before = getDb()
      .prepare(
        "SELECT token_hash FROM refresh_tokens WHERE user_id = ? ORDER BY token_hash",
      )
      .all(userId) as Array<{ token_hash: string }>;
    expect(before.map((r) => r.token_hash)).toEqual(["token-a", "token-b"]);

    deleteRefreshTokensByUserIds([userId]);
    const after = getDb()
      .prepare("SELECT token_hash FROM refresh_tokens WHERE user_id = ?")
      .all(userId) as Array<{ token_hash: string }>;
    expect(after).toHaveLength(0);
  });

  it("deleteUsersByPersonId deletes users and returns changes count", () => {
    const db = getDb();
    db.prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)").run(
      7001,
      "P7001",
    );

    const r1 = db
      .prepare(
        "INSERT INTO users (email, is_admin, person_id) VALUES (?, ?, ?)",
      )
      .run("u1@example.com", 0, 7001);
    const r2 = db
      .prepare(
        "INSERT INTO users (email, is_admin, person_id) VALUES (?, ?, ?)",
      )
      .run("u2@example.com", 0, 7001);
    const userId1 = r1.lastInsertRowid as number;
    const userId2 = r2.lastInsertRowid as number;

    db.prepare(
      "INSERT INTO user_people (user_id, person_id) VALUES (?, ?)",
    ).run(userId1, 7001);
    db.prepare(
      "INSERT INTO user_people (user_id, person_id) VALUES (?, ?)",
    ).run(userId2, 7001);

    expect(getUserIdsByPersonId(7001).sort((a, b) => a - b)).toEqual([
      userId1,
      userId2,
    ]);

    expect(deleteUsersByPersonId(7001)).toBe(2);

    const remainingUsers = db
      .prepare("SELECT id FROM users WHERE person_id = ?")
      .all(7001) as Array<{ id: number }>;
    expect(remainingUsers).toHaveLength(0);

    const remainingUserPeople = db
      .prepare("SELECT 1 FROM user_people WHERE person_id = ?")
      .all(7001) as Array<{ "1": number }>;
    expect(remainingUserPeople).toHaveLength(0);
  });

  it("deleteWhitelistByPersonId deletes and returns changes count", () => {
    getDb()
      .prepare("INSERT INTO person_names (person_id, name) VALUES (?, ?)")
      .run(8001, "P8001");

    const id1 = upsertWhitelistEntryByEmail({
      email: "wl1@example.com",
      isAdmin: false,
      personId: 8001,
    });
    const id2 = upsertWhitelistEntryByEmail({
      email: "wl2@example.com",
      isAdmin: true,
      personId: 8001,
    });
    expect(id1).toBeGreaterThan(0);
    expect(id2).toBeGreaterThan(0);

    expect(deleteWhitelistByPersonId(8001)).toBe(2);
    expect(getWhitelistByEmail("wl1@example.com")).toBeNull();
    expect(getWhitelistByEmail("wl2@example.com")).toBeNull();
  });
});
