import { randomInt, randomUUID, createHash } from "crypto";
import { FIRST_ADMIN_EMAIL } from "../config/env.js";
import { execute, queryAll, queryOne, withTransaction } from "./client.js";

type Timestamp = string | Date;
type AuthUser = {
  id: number;
  email: string;
  isAdmin: boolean;
  personId: number;
};

const toIso = (v: Timestamp): string =>
  v instanceof Date ? v.toISOString() : v;
const placeholders = (ids: unknown[]): string => ids.map(() => "?").join(", ");
const sequence = <T>(
  items: Iterable<T>,
  fn: (item: T) => Promise<unknown>,
): Promise<void> =>
  [...items].reduce<Promise<void>>(
    (prev, item) => prev.then(() => fn(item)).then(() => undefined),
    Promise.resolve(),
  );

const seedFirstAdmin = async (): Promise<void> => {
  const defaultUser = await getOrCreateUser(FIRST_ADMIN_EMAIL, true);
  const whitelisted = await queryOne(
    "SELECT 1 FROM auth_whitelist WHERE email = ?",
    [FIRST_ADMIN_EMAIL],
  );
  if (whitelisted) return;
  await execute(
    "INSERT INTO auth_whitelist (email, is_admin, person_id) VALUES (?, ?, ?)",
    [FIRST_ADMIN_EMAIL, true, defaultUser.personId],
  );
};

/** Schema from packages/db migrations; cleanup expired tokens and seed first admin. */
export const initAuthDb = async (): Promise<void> => {
  await deleteExpiredMagicLinkTokens();
  await deleteExpiredRefreshTokens();
  await seedFirstAdmin();
};

const deleteExpiredMagicLinkTokens = async (): Promise<void> => {
  await execute("DELETE FROM magic_link_tokens WHERE expires_at < NOW()");
};

const deleteExpiredRefreshTokens = async (): Promise<void> => {
  await execute("DELETE FROM refresh_tokens WHERE expires_at < NOW()");
};

export async function isEmailWhitelisted(email: string): Promise<boolean> {
  const row = await queryOne(
    "SELECT 1 FROM auth_whitelist WHERE LOWER(email) = ?",
    [email.trim().toLowerCase()],
  );
  return Boolean(row);
}

export async function isEmailAdmin(email: string): Promise<boolean> {
  const row = await queryOne<{ is_admin: boolean }>(
    "SELECT is_admin FROM auth_whitelist WHERE LOWER(email) = ?",
    [email.trim().toLowerCase()],
  );
  return row != null && Boolean(row.is_admin);
}

async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const row = await queryOne<{
    id: number;
    email: string;
    isAdmin: boolean;
    personId: number | null;
  }>(
    `SELECT id, email, is_admin as "isAdmin", person_id as "personId" FROM users WHERE LOWER(email) = ?`,
    [email],
  );
  if (!row || row.personId == null) return null;
  return { ...row, isAdmin: Boolean(row.isAdmin), personId: row.personId };
}

async function createPersonForUser(email: string): Promise<number> {
  const maxRow = await queryOne<{ m: number | null }>(
    "SELECT MAX(person_id) as m FROM (SELECT person_id FROM image_people UNION SELECT person_id FROM person_names) AS t",
  );
  const newPersonId = (maxRow?.m ?? 0) + 1;
  await execute(
    "INSERT INTO person_names (person_id, name) VALUES (?, ?) ON CONFLICT DO NOTHING",
    [newPersonId, email],
  );
  return newPersonId;
}

async function getWhitelistPersonIdForEmail(
  email: string,
): Promise<number | null> {
  const row = await queryOne<{ personId: number | null }>(
    `SELECT person_id as "personId" FROM auth_whitelist WHERE LOWER(email) = ?`,
    [email],
  );
  return row?.personId ?? null;
}

const insertUser = async (
  email: string,
  isAdmin: boolean,
  personId: number,
): Promise<AuthUser> => {
  const result = await execute(
    "INSERT INTO users (email, is_admin, person_id) VALUES (?, ?, ?)",
    [email, isAdmin, personId],
  );
  if (result.lastId == null) throw new Error("users insert returned no id");
  await execute(
    "INSERT INTO user_people (user_id, person_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
    [result.lastId, personId],
  );
  return { id: result.lastId, email, isAdmin, personId };
};

export async function getOrCreateUser(
  email: string,
  isAdmin: boolean,
): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await getUserByEmail(normalizedEmail);
  if (existing) return existing;

  const whitelistPersonId = await getWhitelistPersonIdForEmail(normalizedEmail);
  const personId =
    whitelistPersonId ?? (await createPersonForUser(normalizedEmail));
  return insertUser(normalizedEmail, isAdmin, personId);
}

/** The person this user IS (their identity). Required for every user. */
async function getUserPersonId(userId: number): Promise<number | null> {
  const row = await queryOne<{ personId: number | null }>(
    `SELECT person_id as "personId" FROM users WHERE id = ?`,
    [userId],
  );
  return row?.personId ?? null;
}

export async function createMagicLinkToken(email: string): Promise<{
  code: string;
  expiresAt: string;
}> {
  await deleteExpiredMagicLinkTokens();

  const normalizedEmail = email.trim().toLowerCase();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await execute(
    "INSERT INTO magic_link_tokens (token_hash, email, expires_at, login_code) VALUES (?, ?, ?, ?)",
    [randomUUID(), normalizedEmail, expiresAt, codeHash],
  );

  return { code, expiresAt };
}

export async function getWhitelist(): Promise<
  Array<{
    id: number;
    email: string;
    isAdmin: boolean;
    invitedAt: string;
    personId: number | null;
  }>
> {
  const rows = await queryAll<{
    id: number;
    email: string;
    isAdmin: boolean;
    invitedAt: Timestamp;
    personId: number | null;
  }>(
    `SELECT id, email, is_admin as "isAdmin", invited_at as "invitedAt", person_id as "personId" FROM auth_whitelist ORDER BY invited_at DESC`,
  );
  return rows.map((r) => ({
    ...r,
    isAdmin: Boolean(r.isAdmin),
    invitedAt: toIso(r.invitedAt),
  }));
}

export async function getWhitelistByEmail(email: string): Promise<{
  id: number;
  email: string;
  isAdmin: boolean;
  invitedAt: string;
  invitedByUserId: number | null;
  personId: number | null;
} | null> {
  const row = await queryOne<{
    id: number;
    email: string;
    isAdmin: boolean;
    invitedAt: Timestamp;
    invitedByUserId: number | null;
    personId: number | null;
  }>(
    `SELECT id, email, is_admin as "isAdmin", invited_at as "invitedAt", invited_by_user_id as "invitedByUserId", person_id as "personId" FROM auth_whitelist WHERE LOWER(email) = ?`,
    [email.trim().toLowerCase()],
  );
  if (!row) return null;
  return {
    ...row,
    isAdmin: Boolean(row.isAdmin),
    invitedAt: toIso(row.invitedAt),
  };
}

export async function updateWhitelistEntry(
  id: number,
  input: { isAdmin?: boolean; personId?: number | null },
): Promise<boolean> {
  const fields = [
    ...(Object.prototype.hasOwnProperty.call(input, "isAdmin")
      ? [{ set: "is_admin = ?", value: Boolean(input.isAdmin) }]
      : []),
    ...(Object.prototype.hasOwnProperty.call(input, "personId")
      ? [{ set: "person_id = ?", value: input.personId ?? null }]
      : []),
  ];
  if (fields.length === 0) return false;

  const result = await execute(
    `UPDATE auth_whitelist SET ${fields.map((f) => f.set).join(", ")} WHERE id = ?`,
    [...fields.map((f) => f.value), id],
  );
  return result.changes > 0;
}

export async function upsertWhitelistEntryByEmail(input: {
  email: string;
  isAdmin: boolean;
  personId: number | null;
  invitedByUserId?: number;
}): Promise<number> {
  const normalized = input.email.trim().toLowerCase();
  await execute(
    `
      INSERT INTO auth_whitelist (email, is_admin, invited_by_user_id, person_id)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        is_admin = excluded.is_admin,
        person_id = excluded.person_id,
        invited_by_user_id = COALESCE(excluded.invited_by_user_id, auth_whitelist.invited_by_user_id)
    `,
    [
      normalized,
      Boolean(input.isAdmin),
      input.invitedByUserId ?? null,
      input.personId,
    ],
  );
  const row = await queryOne<{ id: number }>(
    "SELECT id FROM auth_whitelist WHERE LOWER(email) = ?",
    [normalized],
  );
  return row?.id ?? 0;
}

export async function getUserPeople(userId: number): Promise<number[]> {
  const rows = await queryAll<{ person_id: number }>(
    "SELECT person_id FROM user_people WHERE user_id = ?",
    [userId],
  );
  return rows.map((r) => r.person_id);
}

/** TODO: inspect where and how this is being used */
/** Set the people this user can act on behalf of. Always includes the user's own person (identity). */
export async function setUserPeople(
  userId: number,
  personIds: number[],
): Promise<void> {
  const ownPersonId = await getUserPersonId(userId);
  const ids = new Set(
    ownPersonId == null ? personIds : [...personIds, ownPersonId],
  );

  await withTransaction(async () => {
    await execute("DELETE FROM user_people WHERE user_id = ?", [userId]);
    await sequence(ids, (pid) =>
      execute(
        "INSERT INTO user_people (user_id, person_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
        [userId, pid],
      ),
    );
  });
}

export async function consumeLoginCode(
  email: string,
  codeHash: string,
): Promise<{ email: string } | null> {
  await deleteExpiredMagicLinkTokens();

  const normalized = email.trim().toLowerCase();
  const row = await queryOne<{ email: string }>(
    "SELECT email FROM magic_link_tokens WHERE login_code = ? AND LOWER(email) = ? AND used_at IS NULL AND expires_at > NOW()",
    [codeHash, normalized],
  );

  if (!row) return null;

  await execute(
    "UPDATE magic_link_tokens SET used_at = NOW() WHERE login_code = ? AND LOWER(email) = ? AND used_at IS NULL",
    [codeHash, normalized],
  );
  return row;
}

export async function createRefreshToken(
  tokenHash: string,
  userId: number,
  familyId: string,
  expiresAt: string,
): Promise<void> {
  await deleteExpiredRefreshTokens();

  await execute(
    "INSERT INTO refresh_tokens (token_hash, user_id, family_id, expires_at) VALUES (?, ?, ?, ?)",
    [tokenHash, userId, familyId, expiresAt],
  );
}

export async function consumeRefreshToken(
  tokenHash: string,
): Promise<{ userId: number; familyId: string } | null> {
  const row = await queryOne<{ userId: number; familyId: string }>(
    `SELECT user_id as "userId", family_id as "familyId" FROM refresh_tokens WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash],
  );

  if (!row) return null;

  await execute(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?",
    [tokenHash],
  );
  return row;
}

export async function revokeTokenFamily(familyId: string): Promise<void> {
  await execute(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL",
    [familyId],
  );
}

export async function isRefreshTokenRevoked(
  tokenHash: string,
): Promise<boolean> {
  const row = await queryOne<{ revoked_at: Timestamp | null }>(
    "SELECT revoked_at FROM refresh_tokens WHERE token_hash = ?",
    [tokenHash],
  );
  return row != null && row.revoked_at != null;
}

export async function getUserById(
  userId: number,
): Promise<{ id: number; email: string; isAdmin: boolean } | null> {
  const row = await queryOne<{ id: number; email: string; isAdmin: boolean }>(
    `SELECT id, email, is_admin as "isAdmin" FROM users WHERE id = ?`,
    [userId],
  );
  if (!row) return null;
  return { ...row, isAdmin: Boolean(row.isAdmin) };
}

export async function getUsers(): Promise<
  Array<{
    id: number;
    email: string;
    isAdmin: boolean;
    createdAt: string;
    personId: number | null;
  }>
> {
  const rows = await queryAll<{
    id: number;
    email: string;
    isAdmin: boolean;
    createdAt: Timestamp;
    personId: number | null;
  }>(
    `SELECT id, email, is_admin as "isAdmin", created_at as "createdAt", person_id as "personId" FROM users ORDER BY created_at DESC`,
  );
  return rows.map((r) => ({
    ...r,
    isAdmin: Boolean(r.isAdmin),
    createdAt: toIso(r.createdAt),
  }));
}

export async function getUserIdsByPersonId(
  personId: number,
): Promise<number[]> {
  const rows = await queryAll<{ id: number }>(
    "SELECT id FROM users WHERE person_id = ?",
    [personId],
  );
  return rows.map((r) => r.id);
}

export async function deleteRefreshTokensByUserIds(
  userIds: number[],
): Promise<void> {
  if (userIds.length === 0) return;
  await execute(
    `DELETE FROM refresh_tokens WHERE user_id IN (${placeholders(userIds)})`,
    userIds,
  );
}

export async function deleteUsersByPersonId(personId: number): Promise<number> {
  return withTransaction(async () => {
    const userIds = await getUserIdsByPersonId(personId);
    if (userIds.length === 0) return 0;
    const marks = placeholders(userIds);
    await execute(
      `DELETE FROM user_people WHERE user_id IN (${marks})`,
      userIds,
    );
    const result = await execute(
      `DELETE FROM users WHERE id IN (${marks})`,
      userIds,
    );
    return result.changes;
  });
}

export async function deleteWhitelistByPersonId(
  personId: number,
): Promise<number> {
  const result = await execute(
    "DELETE FROM auth_whitelist WHERE person_id = ?",
    [personId],
  );
  return result.changes;
}

await initAuthDb();
