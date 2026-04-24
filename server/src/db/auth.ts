import { randomInt, createHash } from "crypto";
import { FIRST_ADMIN_EMAIL } from "../config/env.js";
import { getDb } from "./media-db.js";

function initAuthDb(): void {
  const db = getDb();

  db.exec(`
  CREATE TABLE IF NOT EXISTS auth_whitelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    is_admin INTEGER NOT NULL DEFAULT 0,
    invited_at TEXT NOT NULL DEFAULT (datetime('now')),
    invited_by_user_id INTEGER,
    person_id INTEGER REFERENCES person_names(person_id)
  )
`);

  // Migration: add person_id to auth_whitelist if missing
  const whitelistCols = (
    db.prepare("PRAGMA table_info(auth_whitelist)").all() as Array<{
      name: string;
    }>
  ).map((c) => c.name);
  if (!whitelistCols.includes("person_id")) {
    db.exec(
      "ALTER TABLE auth_whitelist ADD COLUMN person_id INTEGER REFERENCES person_names(person_id)",
    );
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    person_id INTEGER REFERENCES person_names(person_id)
  )
`);

  db.exec(`
  CREATE TABLE IF NOT EXISTS user_people (
    user_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, person_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (person_id) REFERENCES person_names(person_id)
  )
`);

  // Migration: add person_id to users if missing (legacy schema)
  const userCols = (
    db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>
  ).map((c) => c.name);
  if (!userCols.includes("person_id")) {
    db.exec(
      "ALTER TABLE users ADD COLUMN person_id INTEGER REFERENCES person_names(person_id)",
    );
  }
  // Backfill: create a person for each user with null person_id
  const usersToBackfill = db
    .prepare("SELECT id, email FROM users WHERE person_id IS NULL")
    .all() as Array<{
    id: number;
    email: string;
  }>;
  for (const u of usersToBackfill) {
    const maxRow = db
      .prepare(
        "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)",
      )
      .get() as { m: number | null };
    const newPersonId = (maxRow?.m ?? 0) + 1;
    db.prepare(
      "INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)",
    ).run(newPersonId, u.email);
    db.prepare("UPDATE users SET person_id = ? WHERE id = ?").run(
      newPersonId,
      u.id,
    );
    db.prepare(
      "INSERT OR IGNORE INTO user_people (user_id, person_id) VALUES (?, ?)",
    ).run(u.id, newPersonId);
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS magic_link_tokens (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT
  )
`);

  const mlCols = (
    db.prepare("PRAGMA table_info(magic_link_tokens)").all() as Array<{
      name: string;
    }>
  ).map((c) => c.name);
  if (!mlCols.includes("login_code")) {
    db.exec("ALTER TABLE magic_link_tokens ADD COLUMN login_code TEXT");
  }

  db.exec(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    family_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT
  )
`);
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)",
  );

  deleteExpiredMagicLinkTokens();
  deleteExpiredRefreshTokens();

  const defaultUser = getOrCreateUser(FIRST_ADMIN_EMAIL, true);
  const defaultUserWhitelisted = db.prepare("SELECT 1 FROM auth_whitelist WHERE email = ?").get(FIRST_ADMIN_EMAIL);

  if (!defaultUserWhitelisted) {
    db.prepare(`
      INSERT INTO auth_whitelist (email, is_admin, person_id)
      VALUES (?, ?, ?)
    `).run(FIRST_ADMIN_EMAIL, 1, defaultUser.personId);
  }
}

function deleteExpiredMagicLinkTokens(): void {
  const db = getDb();

  db.prepare(
    "DELETE FROM magic_link_tokens WHERE expires_at < datetime('now')",
  ).run();
}

function deleteExpiredRefreshTokens(): void {
  const db = getDb();

  db.prepare(
    "DELETE FROM refresh_tokens WHERE expires_at < datetime('now')",
  ).run();
}

export function isEmailWhitelisted(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const row = db
    .prepare("SELECT 1 FROM auth_whitelist WHERE LOWER(email) = ?")
    .get(normalizedEmail) as { "1": number } | undefined;

  return Boolean(row);
}

export function isEmailAdmin(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const row = db
    .prepare("SELECT is_admin FROM auth_whitelist WHERE LOWER(email) = ?")
    .get(normalizedEmail) as { is_admin: number } | undefined;

  return row?.is_admin === 1;
}

export function getUserByEmail(
  email: string,
): { id: number; email: string; isAdmin: boolean; personId: number } | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT id, email, is_admin as isAdmin, person_id as personId FROM users WHERE LOWER(email) = ?",
    )
    .get(email) as
    | { id: number; email: string; isAdmin: number; personId: number | null }
    | undefined;
  if (!row || row.personId == null) return null;
  return { ...row, isAdmin: row.isAdmin === 1, personId: row.personId };
}

function createPersonForUser(email: string): number {
  const db = getDb();
  const maxRow = db
    .prepare(
      "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names)",
    )
    .get() as { m: number | null };
  const newPersonId = (maxRow?.m ?? 0) + 1;
  db.prepare(
    "INSERT OR IGNORE INTO person_names (person_id, name) VALUES (?, ?)",
  ).run(newPersonId, email);
  return newPersonId;
}

function getWhitelistPersonIdForEmail(email: string): number | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT person_id as personId FROM auth_whitelist WHERE LOWER(email) = ?",
    )
    .get(email) as { personId: number | null } | undefined;

  return row?.personId ?? null;
}

export function getOrCreateUser(
  email: string,
  isAdmin: boolean,
): { id: number; email: string; isAdmin: boolean; personId: number } {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = getUserByEmail(normalizedEmail);

  if (existing) return { ...existing, personId: existing.personId };

  const whitelistPersonId = getWhitelistPersonIdForEmail(normalizedEmail);
  const personId = whitelistPersonId ?? createPersonForUser(normalizedEmail);
  const db = getDb();
  const result = db
    .prepare("INSERT INTO users (email, is_admin, person_id) VALUES (?, ?, ?)")
    .run(normalizedEmail, isAdmin ? 1 : 0, personId);
  const id = result.lastInsertRowid as number;
  db.prepare(
    "INSERT OR IGNORE INTO user_people (user_id, person_id) VALUES (?, ?)",
  ).run(id, personId);
  return { id, email: normalizedEmail, isAdmin, personId };
}

/** The person this user IS (their identity). Required for every user. */
export function getUserPersonId(userId: number): number | null {
  const db = getDb();
  const row = db
    .prepare("SELECT person_id as personId FROM users WHERE id = ?")
    .get(userId) as { personId: number | null } | undefined;
  return row?.personId ?? null;
}

/* TODO: see if we can get rid of this */
/** Returns the user ID for FIRST_ADMIN_EMAIL (creates user if needed). Used when AUTH_ENABLED=false. */
export function getDefaultOwnerId(): number {
  const email = FIRST_ADMIN_EMAIL.trim();
  const user = getOrCreateUser(email, true);

  return user.id;
}

export function createMagicLinkToken(email: string): {
  code: string;
  expiresAt: string;
} {
  deleteExpiredMagicLinkTokens();

  const normalizedEmail = email.trim().toLowerCase();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const db = getDb();

  db.prepare(
    "INSERT INTO magic_link_tokens (email, expires_at, login_code) VALUES (?, ?, ?)",
  ).run(normalizedEmail, expiresAt, codeHash);

  return { code, expiresAt };
}

export function consumeMagicLinkToken(token: string): { email: string } | null {
  deleteExpiredMagicLinkTokens();

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const db = getDb();
  const row = db
    .prepare(
      "SELECT email FROM magic_link_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')",
    )
    .get(tokenHash) as { email: string } | undefined;

  if (!row) return null;

  db.prepare(
    "UPDATE magic_link_tokens SET used_at = datetime('now') WHERE token_hash = ?",
  ).run(tokenHash);
  return row;
}

export function getWhitelist(): Array<{
  id: number;
  email: string;
  isAdmin: boolean;
  invitedAt: string;
  personId: number | null;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, email, is_admin as isAdmin, invited_at as invitedAt, person_id as personId FROM auth_whitelist ORDER BY invited_at DESC",
    )
    .all() as Array<{
    id: number;
    email: string;
    isAdmin: number;
    invitedAt: string;
    personId: number | null;
  }>;
  return rows.map((r) => ({ ...r, isAdmin: r.isAdmin === 1 }));
}

export function addToWhitelist(
  email: string,
  isAdmin: boolean,
  invitedByUserId?: number,
  personId?: number | null,
): number {
  const normalized = email.trim().toLowerCase();
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO auth_whitelist (email, is_admin, invited_by_user_id, person_id) VALUES (?, ?, ?, ?)",
    )
    .run(
      normalized,
      isAdmin ? 1 : 0,
      invitedByUserId ?? null,
      personId ?? null,
    );
  return result.lastInsertRowid as number;
}

export function updateWhitelistPerson(
  id: number,
  personId: number | null,
): boolean {
  const db = getDb();
  const result = db
    .prepare("UPDATE auth_whitelist SET person_id = ? WHERE id = ?")
    .run(personId, id);
  return result.changes > 0;
}

export function removeFromWhitelist(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM auth_whitelist WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getUserPeople(userId: number): number[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT person_id FROM user_people WHERE user_id = ?")
    .all(userId) as Array<{ person_id: number }>;
  return rows.map((r) => r.person_id);
}

/** TODO: inspect where and how this is being used */
/** Set the people this user can act on behalf of. Always includes the user's own person (identity). */
export function setUserPeople(userId: number, personIds: number[]): void {
  const ownPersonId = getUserPersonId(userId);
  const ids = new Set(personIds);
  if (ownPersonId != null) ids.add(ownPersonId);

  const db = getDb();

  db.prepare("DELETE FROM user_people WHERE user_id = ?").run(userId);

  const insert = db.prepare(
    "INSERT INTO user_people (user_id, person_id) VALUES (?, ?)",
  );
  for (const pid of ids) {
    insert.run(userId, pid);
  }
}

export function consumeLoginCode(
  email: string,
  codeHash: string,
): { email: string } | null {
  deleteExpiredMagicLinkTokens();

  const normalized = email.trim().toLowerCase();
  const db = getDb();
  const row = db
    .prepare(
      "SELECT email FROM magic_link_tokens WHERE login_code = ? AND LOWER(email) = ? AND used_at IS NULL AND expires_at > datetime('now')",
    )
    .get(codeHash, normalized) as { email: string } | undefined;

  if (!row) return null;

  db.prepare(
    "UPDATE magic_link_tokens SET used_at = datetime('now') WHERE login_code = ? AND LOWER(email) = ? AND used_at IS NULL",
  ).run(codeHash, normalized);
  return row;
}

export function createRefreshToken(
  tokenHash: string,
  userId: number,
  familyId: string,
  expiresAt: string,
): void {
  const db = getDb();

  deleteExpiredRefreshTokens();

  db.prepare(
    "INSERT INTO refresh_tokens (token_hash, user_id, family_id, expires_at) VALUES (?, ?, ?, ?)",
  ).run(tokenHash, userId, familyId, expiresAt);
}

export function consumeRefreshToken(
  tokenHash: string,
): { userId: number; familyId: string } | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT user_id as userId, family_id as familyId FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')",
    )
    .get(tokenHash) as { userId: number; familyId: string } | undefined;

  if (!row) return null;

  db.prepare(
    "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?",
  ).run(tokenHash);
  return row;
}

export function revokeTokenFamily(familyId: string): void {
  const db = getDb();

  db.prepare(
    "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE family_id = ? AND revoked_at IS NULL",
  ).run(familyId);
}

export function isRefreshTokenRevoked(tokenHash: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT revoked_at FROM refresh_tokens WHERE token_hash = ?")
    .get(tokenHash) as { revoked_at: string | null } | undefined;

  return row != null && row.revoked_at != null;
}

export function revokeUserRefreshTokens(userId: number): void {
  const db = getDb();

  db.prepare(
    "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL",
  ).run(userId);
}

export function getUserById(
  userId: number,
): { id: number; email: string; isAdmin: boolean } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT id, email, is_admin as isAdmin FROM users WHERE id = ?")
    .get(userId) as { id: number; email: string; isAdmin: number } | undefined;

  if (!row) return null;

  return { ...row, isAdmin: row.isAdmin === 1 };
}

export function getUsers(): Array<{
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  personId: number | null;
}> {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, email, is_admin as isAdmin, created_at as createdAt, person_id as personId FROM users ORDER BY created_at DESC",
    )
    .all() as Array<{
    id: number;
    email: string;
    isAdmin: number;
    createdAt: string;
    personId: number | null;
  }>;
  return rows.map((r) => ({ ...r, isAdmin: r.isAdmin === 1 }));
}

initAuthDb();
