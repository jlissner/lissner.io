import { beforeEach, describe, expect, it } from "vitest";
import { execute, queryAll, queryOne } from "./client.js";
import { resetMediaTestDb } from "./test-media-db.js";
import {
  createRefreshToken,
  deleteRefreshTokensByUserIds,
  deleteUsersByPersonId,
  deleteWhitelistByPersonId,
  getOrCreateUser,
  getUserIdsByPersonId,
  getWhitelistByEmail,
  initAuthDb,
  updateWhitelistEntry,
  upsertWhitelistEntryByEmail,
} from "./auth.js";

describe("auth db whitelist helpers", () => {
  beforeEach(async () => {
    await resetMediaTestDb();
    await initAuthDb();
  });

  it("upserts whitelist entries by email and reads them back", async () => {
    await execute("INSERT INTO person_names (person_id, name) VALUES (?, ?)", [
      123,
      "P123",
    ]);
    await execute("INSERT INTO person_names (person_id, name) VALUES (?, ?)", [
      456,
      "P456",
    ]);

    const id1 = await upsertWhitelistEntryByEmail({
      email: "Test@Example.com",
      isAdmin: false,
      personId: 123,
      invitedByUserId: 999,
    });
    expect(id1).toBeGreaterThan(0);

    const row1 = await getWhitelistByEmail("test@example.com");
    expect(row1).toEqual(
      expect.objectContaining({
        id: id1,
        email: "test@example.com",
        isAdmin: false,
        invitedByUserId: 999,
        personId: 123,
      }),
    );

    const id2 = await upsertWhitelistEntryByEmail({
      email: "test@example.com",
      isAdmin: true,
      personId: 456,
    });
    expect(id2).toBe(id1);

    const row2 = await getWhitelistByEmail("TEST@example.com");
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

  it("updates whitelist entries without clobbering fields unless provided", async () => {
    await execute("INSERT INTO person_names (person_id, name) VALUES (?, ?)", [
      2001,
      "P2001",
    ]);

    const id = await upsertWhitelistEntryByEmail({
      email: "update-me@example.com",
      isAdmin: false,
      personId: 2001,
      invitedByUserId: 7,
    });

    expect(await updateWhitelistEntry(id, { isAdmin: true })).toBe(true);
    expect(await getWhitelistByEmail("update-me@example.com")).toEqual(
      expect.objectContaining({
        id,
        isAdmin: true,
        invitedByUserId: 7,
        personId: 2001,
      }),
    );

    expect(await updateWhitelistEntry(id, { personId: null })).toBe(true);
    expect(await getWhitelistByEmail("update-me@example.com")).toEqual(
      expect.objectContaining({
        id,
        isAdmin: true,
        invitedByUserId: 7,
        personId: null,
      }),
    );
  });

  it("returns false when updateWhitelistEntry is given no fields", async () => {
    const id = await upsertWhitelistEntryByEmail({
      email: "no-fields@example.com",
      isAdmin: false,
      personId: null,
    });
    expect(await updateWhitelistEntry(id, {})).toBe(false);
  });

  it("creates the default first-admin user and whitelist entry on init", async () => {
    const row = await queryOne<{ email: string }>(
      "SELECT email FROM users WHERE LOWER(email) = ?",
      ["first-admin@example.com"],
    );
    expect(row?.email).toBe("first-admin@example.com");

    const wl = await getWhitelistByEmail("first-admin@example.com");
    expect(wl?.email).toBe("first-admin@example.com");
  });

  it("getUserIdsByPersonId returns empty when none", async () => {
    expect(await getUserIdsByPersonId(999999)).toEqual([]);
  });

  it("deleteRefreshTokensByUserIds removes rows for the given user ids", async () => {
    const { id: userId } = await getOrCreateUser("refresh@example.com", false);
    await createRefreshToken(
      "token-a",
      userId,
      "fam",
      new Date(Date.now() + 60_000).toISOString(),
    );
    await createRefreshToken(
      "token-b",
      userId,
      "fam",
      new Date(Date.now() + 60_000).toISOString(),
    );

    const before = await queryAll<{ token_hash: string }>(
      "SELECT token_hash FROM refresh_tokens WHERE user_id = ? ORDER BY token_hash",
      [userId],
    );
    expect(before.map((r) => r.token_hash)).toEqual(["token-a", "token-b"]);

    await deleteRefreshTokensByUserIds([userId]);
    const after = await queryAll<{ token_hash: string }>(
      "SELECT token_hash FROM refresh_tokens WHERE user_id = ?",
      [userId],
    );
    expect(after).toHaveLength(0);
  });

  it("deleteUsersByPersonId deletes users and returns changes count", async () => {
    await execute("INSERT INTO person_names (person_id, name) VALUES (?, ?)", [
      7001,
      "P7001",
    ]);

    const r1 = await execute(
      "INSERT INTO users (email, is_admin, person_id) VALUES (?, ?, ?)",
      ["u1@example.com", false, 7001],
    );
    const r2 = await execute(
      "INSERT INTO users (email, is_admin, person_id) VALUES (?, ?, ?)",
      ["u2@example.com", false, 7001],
    );
    const userId1 = r1.lastId!;
    const userId2 = r2.lastId!;

    await execute(
      "INSERT INTO user_people (user_id, person_id) VALUES (?, ?)",
      [userId1, 7001],
    );
    await execute(
      "INSERT INTO user_people (user_id, person_id) VALUES (?, ?)",
      [userId2, 7001],
    );

    const ids = await getUserIdsByPersonId(7001);
    expect(ids.sort((a, b) => a - b)).toEqual([userId1, userId2]);

    expect(await deleteUsersByPersonId(7001)).toBe(2);

    const remainingUsers = await queryAll<{ id: number }>(
      "SELECT id FROM users WHERE person_id = ?",
      [7001],
    );
    expect(remainingUsers).toHaveLength(0);

    const remainingUserPeople = await queryAll(
      "SELECT 1 FROM user_people WHERE person_id = ?",
      [7001],
    );
    expect(remainingUserPeople).toHaveLength(0);
  });

  it("deleteWhitelistByPersonId deletes and returns changes count", async () => {
    await execute("INSERT INTO person_names (person_id, name) VALUES (?, ?)", [
      8001,
      "P8001",
    ]);

    const id1 = await upsertWhitelistEntryByEmail({
      email: "wl1@example.com",
      isAdmin: false,
      personId: 8001,
    });
    const id2 = await upsertWhitelistEntryByEmail({
      email: "wl2@example.com",
      isAdmin: true,
      personId: 8001,
    });
    expect(id1).toBeGreaterThan(0);
    expect(id2).toBeGreaterThan(0);

    expect(await deleteWhitelistByPersonId(8001)).toBe(2);
    expect(await getWhitelistByEmail("wl1@example.com")).toBeNull();
    expect(await getWhitelistByEmail("wl2@example.com")).toBeNull();
  });
});
