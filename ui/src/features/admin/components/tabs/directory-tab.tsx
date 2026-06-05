import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  createDirectoryPerson,
  deleteDirectoryPerson,
  listPeopleDirectory,
  updateDirectoryPerson,
  type PeopleDirectoryEntry,
} from "../../api";
import { canDeleteDirectoryPerson } from "../directory-delete";

function friendlyDirectoryError(err: unknown): string {
  if (!(err instanceof ApiError)) return "Request failed";
  const body =
    err.body !== null && typeof err.body === "object"
      ? (err.body as Record<string, unknown>)
      : null;
  const code = body && typeof body.code === "string" ? body.code : null;

  if (err.status === 400 && code === "person_directory_invalid_email") {
    return "That email address is invalid.";
  }
  if (err.status === 409 && code === "person_directory_email_in_use") {
    return "That email address is already in use.";
  }
  return err.message || "Request failed";
}

export function DirectoryTab() {
  const [directory, setDirectory] = useState<PeopleDirectoryEntry[]>([]);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [directorySaving, setDirectorySaving] = useState(false);
  const [directoryNewName, setDirectoryNewName] = useState("");
  const [directoryNewEmail, setDirectoryNewEmail] = useState("");
  const [directoryNewIsAdmin, setDirectoryNewIsAdmin] = useState(false);
  const [directoryEditingPersonId, setDirectoryEditingPersonId] = useState<
    number | null
  >(null);
  const [directoryEditName, setDirectoryEditName] = useState("");
  const [directoryEditEmail, setDirectoryEditEmail] = useState("");
  const [directoryEditIsAdmin, setDirectoryEditIsAdmin] = useState(false);

  const fetchDirectory = useCallback(async () => {
    setDirectoryError(null);
    try {
      setDirectory(await listPeopleDirectory());
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to load the directory";
      setDirectoryError(message);
    }
  }, []);

  useEffect(() => {
    void fetchDirectory();
  }, [fetchDirectory]);

  const startEditDirectoryPerson = useCallback((row: PeopleDirectoryEntry) => {
    setDirectoryEditingPersonId(row.personId);
    setDirectoryEditName(row.name);
    setDirectoryEditEmail(row.email ?? "");
    setDirectoryEditIsAdmin(row.email != null ? row.isAdmin : false);
    setDirectoryError(null);
  }, []);

  const cancelEditDirectoryPerson = useCallback(() => {
    setDirectoryEditingPersonId(null);
    setDirectoryEditName("");
    setDirectoryEditEmail("");
    setDirectoryEditIsAdmin(false);
    setDirectoryError(null);
  }, []);

  const handleCreateDirectoryPerson = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const name = directoryNewName.trim();
      const email = directoryNewEmail.trim();
      if (name === "") return;

      setDirectorySaving(true);
      setDirectoryError(null);
      try {
        await createDirectoryPerson({
          name,
          email: email === "" ? undefined : email,
          isAdmin: email === "" ? undefined : directoryNewIsAdmin,
        });
        setDirectoryNewName("");
        setDirectoryNewEmail("");
        setDirectoryNewIsAdmin(false);
        await fetchDirectory();
      } catch (err) {
        setDirectoryError(friendlyDirectoryError(err));
      } finally {
        setDirectorySaving(false);
      }
    },
    [directoryNewEmail, directoryNewIsAdmin, directoryNewName, fetchDirectory],
  );

  const handleUpdateDirectoryPerson = useCallback(async () => {
    if (directoryEditingPersonId == null) return;
    const name = directoryEditName.trim();
    const email = directoryEditEmail.trim();
    if (name === "") return;

    setDirectorySaving(true);
    setDirectoryError(null);
    try {
      await updateDirectoryPerson(directoryEditingPersonId, {
        name,
        email: email === "" ? undefined : email,
        isAdmin: email === "" ? undefined : directoryEditIsAdmin,
      });
      cancelEditDirectoryPerson();
      await fetchDirectory();
    } catch (err) {
      setDirectoryError(friendlyDirectoryError(err));
    } finally {
      setDirectorySaving(false);
    }
  }, [
    cancelEditDirectoryPerson,
    directoryEditEmail,
    directoryEditIsAdmin,
    directoryEditName,
    directoryEditingPersonId,
    fetchDirectory,
  ]);

  const handleDeleteDirectoryPerson = useCallback(
    async (row: PeopleDirectoryEntry) => {
      if (!canDeleteDirectoryPerson(row)) return;
      if (
        !confirm(
          `Delete "${row.name}" from the directory? This will remove their tags from media and revoke login eligibility if present.`,
        )
      ) {
        return;
      }
      setDirectorySaving(true);
      setDirectoryError(null);
      try {
        await deleteDirectoryPerson(row.personId);
        if (directoryEditingPersonId === row.personId) {
          cancelEditDirectoryPerson();
        }
        await fetchDirectory();
      } catch (err) {
        setDirectoryError(friendlyDirectoryError(err));
      } finally {
        setDirectorySaving(false);
      }
    },
    [cancelEditDirectoryPerson, directoryEditingPersonId, fetchDirectory],
  );

  return (
    <div
      id="admin-panel-users"
      role="tabpanel"
      aria-labelledby="admin-tab-users"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>Directory</h3>
        <p className="admin-page__desc">
          Manage people in your family directory. People can exist without
          accounts; adding an email enables login invites. Identity people
          (linked to a user) cannot be deleted.
        </p>
        <form
          onSubmit={handleCreateDirectoryPerson}
          className="admin-page__form"
        >
          <input
            type="text"
            placeholder="Name"
            value={directoryNewName}
            onChange={(e) => setDirectoryNewName(e.target.value)}
            className="form__input"
            disabled={directorySaving}
          />
          <input
            type="email"
            placeholder="email@example.com (optional)"
            value={directoryNewEmail}
            onChange={(e) => {
              const next = e.target.value;
              setDirectoryNewEmail(next);
              if (next.trim() === "") setDirectoryNewIsAdmin(false);
            }}
            className="form__input"
            disabled={directorySaving}
          />
          <label className="admin-page__checkbox">
            <input
              type="checkbox"
              checked={directoryNewIsAdmin}
              onChange={(e) => setDirectoryNewIsAdmin(e.target.checked)}
              disabled={directorySaving || directoryNewEmail.trim() === ""}
            />
            Admin
          </label>
          <Button type="submit" size="sm" disabled={directorySaving}>
            {directorySaving ? "Saving…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void fetchDirectory()}
            disabled={directorySaving}
          >
            Refresh
          </Button>
        </form>

        {directoryError && (
          <Alert variant="danger" role="alert">
            <p>{directoryError}</p>
          </Alert>
        )}

        {directoryEditingPersonId != null && (
          <div className="admin-page__form" style={{ marginTop: 8 }}>
            <input
              type="text"
              placeholder="Name"
              value={directoryEditName}
              onChange={(e) => setDirectoryEditName(e.target.value)}
              className="form__input"
              disabled={directorySaving}
            />
            <input
              type="email"
              placeholder="email@example.com (optional)"
              value={directoryEditEmail}
              onChange={(e) => {
                const next = e.target.value;
                setDirectoryEditEmail(next);
                if (next.trim() === "") setDirectoryEditIsAdmin(false);
              }}
              className="form__input"
              disabled={directorySaving}
            />
            <label className="admin-page__checkbox">
              <input
                type="checkbox"
                checked={directoryEditIsAdmin}
                onChange={(e) => setDirectoryEditIsAdmin(e.target.checked)}
                disabled={directorySaving || directoryEditEmail.trim() === ""}
              />
              Admin
            </label>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleUpdateDirectoryPerson()}
              disabled={directorySaving}
            >
              {directorySaving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => cancelEditDirectoryPerson()}
              disabled={directorySaving}
            >
              Cancel
            </Button>
          </div>
        )}

        <div
          className="admin-page__sql-table-wrap"
          style={{ marginTop: "var(--space-2)" }}
        >
          <table className="admin-page__sql-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Login</th>
                <th>Admin</th>
                <th>Identity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {directory.map((row) => (
                <tr key={row.personId}>
                  <td>{row.name}</td>
                  <td>{row.email ?? "—"}</td>
                  <td>
                    {row.canLogin ? (
                      <span className="admin-page__badge">can log in</span>
                    ) : (
                      <span className="admin-page__meta">no</span>
                    )}
                  </td>
                  <td>
                    {row.isAdmin ? (
                      <span className="admin-page__badge">admin</span>
                    ) : (
                      <span className="admin-page__meta">no</span>
                    )}
                  </td>
                  <td>
                    {row.isIdentity ? (
                      <span className="admin-page__badge">identity</span>
                    ) : (
                      <span className="admin-page__meta">—</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => startEditDirectoryPerson(row)}
                      disabled={directorySaving}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => void handleDeleteDirectoryPerson(row)}
                      disabled={directorySaving}
                      title="Delete person"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="admin-page__sql-meta">
            {directory.length} entr{directory.length === 1 ? "y" : "ies"}
          </p>
        </div>
      </section>
    </div>
  );
}
