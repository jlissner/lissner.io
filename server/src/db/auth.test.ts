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
});
