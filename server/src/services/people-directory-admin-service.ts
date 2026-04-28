import * as authDb from "../db/auth.js";
import * as mediaDb from "../db/media.js";
import type { AdminServiceResult } from "./admin-service.js";
import { HttpError } from "../lib/http-error.js";
import { z } from "zod";

type PeopleDirectoryRow = {
  personId: number;
  name: string;
  email: string | null;
  canLogin: boolean;
  isAdmin: boolean;
  isIdentity: boolean;
  whitelistEntryId: number | null;
};

function ok<T>(value: T): AdminServiceResult<T> {
  return { ok: true, value };
}

function fail<T>(status: number, error: string): AdminServiceResult<T> {
  return { ok: false, status, error };
}

const emailSchema = z.string().trim().email();

function normalizeAndValidateEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  const parsed = emailSchema.safeParse(normalized);
  if (parsed.success) return parsed.data;
  throw new HttpError(
    400,
    "Invalid email address",
    "person_directory_invalid_email",
  );
}

function throwEmailInUse(): never {
  throw new HttpError(
    409,
    "Email is already in use",
    "person_directory_email_in_use",
  );
}

function getDirectoryRowByPersonId(
  personId: number,
): PeopleDirectoryRow | null {
  const listed = listDirectory();
  if (!listed.ok) return null;
  return listed.value.find((r) => r.personId === personId) ?? null;
}

export function listDirectory(): AdminServiceResult<PeopleDirectoryRow[]> {
  try {
    const personIds = mediaDb.getAllPersonIds();
    const personNames = mediaDb.getPersonNames();
    const users = authDb.getUsers();
    const whitelist = authDb.getWhitelist();

    const usersByPersonId = new Map(
      users
        .filter((u) => u.personId != null)
        .map((u) => [
          u.personId as number,
          { email: u.email, isAdmin: u.isAdmin },
        ]),
    );

    const whitelistByPersonId = new Map(
      whitelist
        .filter((w) => w.personId != null)
        .map((w) => [
          w.personId as number,
          { id: w.id, email: w.email, isAdmin: w.isAdmin },
        ]),
    );

    const whitelistByEmail = new Map(
      whitelist.map((w) => [
        w.email.trim().toLowerCase(),
        { id: w.id, isAdmin: w.isAdmin, personId: w.personId },
      ]),
    );

    const rows = personIds
      .map((personId) => {
        const identityUser = usersByPersonId.get(personId);
        const whitelistForPerson = whitelistByPersonId.get(personId);
        const email = identityUser?.email ?? whitelistForPerson?.email ?? null;
        const whitelistForEmail =
          email == null ? undefined : whitelistByEmail.get(email.toLowerCase());

        const isAdmin = Boolean(
          identityUser?.isAdmin || whitelistForEmail?.isAdmin,
        );
        const canLogin = identityUser != null || whitelistForPerson != null;
        const isIdentity = identityUser != null;

        return {
          personId,
          name: personNames.get(personId) ?? `Person ${personId}`,
          email,
          canLogin,
          isAdmin,
          isIdentity,
          whitelistEntryId: whitelistForPerson?.id ?? null,
        } satisfies PeopleDirectoryRow;
      })
      .sort((a, b) => {
        const byName = a.name.localeCompare(b.name);
        if (byName !== 0) return byName;
        return a.personId - b.personId;
      });

    return { ok: true, value: rows };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Failed to list directory",
    };
  }
}

export function createDirectoryPerson(input: {
  name: string;
  email?: string;
  isAdmin?: boolean;
  actorUserId?: number;
}): AdminServiceResult<PeopleDirectoryRow> {
  const createdPersonId = mediaDb.createPerson(input.name.trim());
  const normalizedEmail =
    input.email == null ? null : normalizeAndValidateEmail(input.email);

  if (normalizedEmail != null) {
    const users = authDb.getUsers();
    const userEmailInUse = users.some(
      (u) => u.email.trim().toLowerCase() === normalizedEmail,
    );
    if (userEmailInUse) throwEmailInUse();
    const existingWhitelist = authDb.getWhitelistByEmail(normalizedEmail);
    if (existingWhitelist != null) throwEmailInUse();

    authDb.upsertWhitelistEntryByEmail({
      email: normalizedEmail,
      isAdmin: input.isAdmin ?? false,
      personId: createdPersonId,
      invitedByUserId: input.actorUserId,
    });
  }

  console.info({
    action: "create",
    actorUserId: input.actorUserId ?? null,
    personId: createdPersonId,
    email: normalizedEmail,
  });

  const row = getDirectoryRowByPersonId(createdPersonId);
  if (row == null) return fail(500, "Failed to load created directory row");
  return ok(row);
}

export function updateDirectoryPerson(input: {
  personId: number;
  name: string;
  email?: string;
  isAdmin?: boolean;
  actorUserId?: number;
}): AdminServiceResult<PeopleDirectoryRow> {
  const existing = getDirectoryRowByPersonId(input.personId);
  if (existing == null) return fail(404, "Person not found");

  mediaDb.setPersonName(input.personId, input.name.trim());

  const normalizedEmail =
    input.email == null ? null : normalizeAndValidateEmail(input.email);
  const currentEmailNormalized =
    existing.email == null ? null : existing.email.trim().toLowerCase();

  if (normalizedEmail != null && normalizedEmail !== currentEmailNormalized) {
    const users = authDb.getUsers();
    const userEmailInUse = users.some((u) => {
      const uEmail = u.email.trim().toLowerCase();
      if (uEmail !== normalizedEmail) return false;
      return u.personId != null && u.personId !== input.personId;
    });
    if (userEmailInUse) throwEmailInUse();
    const wl = authDb.getWhitelistByEmail(normalizedEmail);
    if (wl != null) throwEmailInUse();

    authDb.upsertWhitelistEntryByEmail({
      email: normalizedEmail,
      isAdmin: input.isAdmin ?? existing.isAdmin,
      personId: input.personId,
      invitedByUserId: input.actorUserId,
    });
  }

  const emailForAdminToggle = normalizedEmail ?? currentEmailNormalized ?? null;
  if (emailForAdminToggle != null && input.isAdmin != null) {
    const hasIdentityUser = authDb
      .getUsers()
      .some((u) => u.personId === input.personId);
    const effectivePersonId = hasIdentityUser ? input.personId : input.personId;

    authDb.upsertWhitelistEntryByEmail({
      email: emailForAdminToggle,
      isAdmin: input.isAdmin,
      personId: effectivePersonId,
      invitedByUserId: input.actorUserId,
    });
  }

  console.info({
    action: "update",
    actorUserId: input.actorUserId ?? null,
    personId: input.personId,
    email: emailForAdminToggle,
  });

  const updated = getDirectoryRowByPersonId(input.personId);
  if (updated == null) return fail(500, "Failed to load updated directory row");
  return ok(updated);
}

export function deleteDirectoryPerson(input: {
  personId: number;
  actorUserId?: number;
}): AdminServiceResult<{ deleted: number }> {
  const userIds = authDb.getUserIdsByPersonId(input.personId);
  authDb.deleteRefreshTokensByUserIds(userIds);
  authDb.deleteUsersByPersonId(input.personId);
  authDb.deleteWhitelistByPersonId(input.personId);
  mediaDb.deletePersonSafe(input.personId);

  console.info({
    action: "delete",
    actorUserId: input.actorUserId ?? null,
    personId: input.personId,
    email: null,
    deletedUserIds: userIds,
  });

  return ok({ deleted: input.personId });
}
