import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataExplorer } from "./data-explorer";

interface WhitelistEntry {
  id: number;
  email: string;
  isAdmin: boolean;
  invitedAt: string;
  personId: number | null;
}

interface User {
  id: number;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  personId: number | null;
}

export function AdminPage() {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [people, setPeople] = useState<Array<{ id: number; name: string }>>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newPersonId, setNewPersonId] = useState<number | "">("");
  const [linkingUser, setLinkingUser] = useState<number | null>(null);
  const [userPeople, setUserPeople] = useState<Record<number, number[]>>({});
  const [sqlExplorerAvailable, setSqlExplorerAvailable] = useState(false);
  const [dataExplorerAvailable, setDataExplorerAvailable] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM media LIMIT 10");
  const [sqlResult, setSqlResult] = useState<
    | { type: "select"; columns: string[]; rows: Record<string, unknown>[] }
    | { type: "write"; changes: number; lastInsertRowid: number }
    | null
  >(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);

  const fetchData = useCallback(async () => {
    const [wlRes, uRes, pRes, sqlAvailRes, dataAvailRes] = await Promise.all([
      fetch("/api/admin/whitelist", { credentials: "include" }),
      fetch("/api/admin/users", { credentials: "include" }),
      fetch("/api/people", { credentials: "include" }),
      fetch("/api/admin/sql-explorer-available", { credentials: "include" }),
      fetch("/api/admin/data-explorer-available", { credentials: "include" }),
    ]);

    if (wlRes.ok) setWhitelist(await wlRes.json());
    if (uRes.ok) {
      const u = await uRes.json();
      setUsers(u);
      const personMap: Record<number, number[]> = {};
      for (const user of u) {
        const upRes = await fetch(`/api/admin/users/${user.id}/people`, { credentials: "include" });
        if (upRes.ok) {
          const { personIds } = await upRes.json();
          personMap[user.id] = personIds;
        }
      }
      setUserPeople(personMap);
    }
    if (pRes.ok) {
      const pData = await pRes.json();
      setPeople(Array.isArray(pData) ? pData : (pData.people ?? []));
    }
    if (sqlAvailRes.ok) {
      const { available } = await sqlAvailRes.json();
      setSqlExplorerAvailable(available);
    }
    if (dataAvailRes.ok) {
      const { available } = await dataAvailRes.json();
      setDataExplorerAvailable(available);
    }
  }, []);

  const handleRunSql = useCallback(async () => {
    setSqlRunning(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      const res = await fetch("/api/admin/sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: sqlQuery }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSqlResult(data);
      } else {
        setSqlError(data.error || "Query failed");
      }
    } catch (err) {
      setSqlError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSqlRunning(false);
    }
  }, [sqlQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    const res = await fetch("/api/admin/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail.trim(),
        isAdmin: newIsAdmin,
        personId: newPersonId !== "" ? newPersonId : undefined,
      }),
      credentials: "include",
    });

    if (res.ok) {
      setNewEmail("");
      setNewIsAdmin(false);
      setNewPersonId("");
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Failed to add");
    }
  };

  const handleRemoveWhitelist = async (id: number) => {
    if (!confirm("Remove from whitelist?")) return;
    const res = await fetch(`/api/admin/whitelist/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) fetchData();
  };

  const handleSetUserPeople = async (userId: number, personIds: number[]) => {
    const res = await fetch(`/api/admin/users/${userId}/people`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personIds }),
      credentials: "include",
    });
    if (res.ok) {
      setUserPeople((prev) => ({ ...prev, [userId]: personIds }));
      setLinkingUser(null);
    }
  };

  const togglePersonForUser = (userId: number, personId: number) => {
    const current = userPeople[userId] ?? [];
    const next = current.includes(personId)
      ? current.filter((p) => p !== personId)
      : [...current, personId];
    handleSetUserPeople(userId, next);
  };

  return (
    <div className="admin-page">
      <h2 className="admin-page__title">Admin</h2>

      <section className="admin-page__section">
        <h3>Whitelist</h3>
        <p className="admin-page__desc">
          Only whitelisted emails can receive magic links. Add users here to grant access.
        </p>
        <form onSubmit={handleAddWhitelist} className="admin-page__form">
          <input
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="form__input"
          />
          <label className="admin-page__checkbox">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
            />
            Admin
          </label>
          <select
            className="form__select"
            value={newPersonId === "" ? "" : newPersonId}
            onChange={(e) =>
              setNewPersonId(e.target.value === "" ? "" : parseInt(e.target.value, 10))
            }
            title="Assign existing person (optional)"
          >
            <option value="">No person</option>
            {people
              .filter((p) => !users.some((u) => u.personId === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <Button type="submit" size="sm">
            Add
          </Button>
        </form>
        <ul className="admin-page__list">
          {whitelist.map((w) => {
            const assignedPerson =
              w.personId != null ? people.find((p) => p.id === w.personId) : null;
            return (
              <li key={w.id} className="admin-page__list-item">
                <span>{w.email}</span>
                {w.isAdmin && <span className="admin-page__badge">admin</span>}
                {assignedPerson && (
                  <span className="admin-page__meta">→ {assignedPerson.name}</span>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleRemoveWhitelist(w.id)}>
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="admin-page__section">
        <h3>Users & People</h3>
        <p className="admin-page__desc">
          Each user is one person (identity). Users can act on behalf of additional people to filter
          photos. The identity person is always included.
        </p>
        <ul className="admin-page__list">
          {users.map((u) => {
            const identityPerson =
              u.personId != null ? people.find((p) => p.id === u.personId) : null;
            return (
              <li key={u.id} className="admin-page__list-item admin-page__list-item--stacked">
                <div>
                  <span>{u.email}</span>
                  {u.isAdmin && <span className="admin-page__badge">admin</span>}
                  {identityPerson && (
                    <span className="admin-page__meta">is {identityPerson.name}</span>
                  )}
                </div>
                <div className="admin-page__people">
                  {linkingUser === u.id ? (
                    <div className="admin-page__people-picker">
                      {people.map((p) => {
                        const isIdentity = p.id === u.personId;
                        return (
                          <label
                            key={p.id}
                            className={`admin-page__people-option ${isIdentity ? "admin-page__people-option--identity" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={(userPeople[u.id] ?? []).includes(p.id)}
                              onChange={() => !isIdentity && togglePersonForUser(u.id, p.id)}
                              disabled={isIdentity}
                            />
                            {p.name}
                            {isIdentity && " (identity)"}
                          </label>
                        );
                      })}
                      <Button variant="ghost" size="sm" onClick={() => setLinkingUser(null)}>
                        Done
                      </Button>
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setLinkingUser(u.id)}>
                      {(userPeople[u.id] ?? []).length} people
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {dataExplorerAvailable && (
        <section className="admin-page__section">
          <DataExplorer />
        </section>
      )}

      {sqlExplorerAvailable && (
        <section className="admin-page__section">
          <h3>SQL Explorer</h3>
          <p className="admin-page__desc">
            Run SQL directly against the database. Only available locally with
            SQL_EXPLORER_ENABLED=true.
          </p>
          <div className="admin-page__sql">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="admin-page__sql-input"
              rows={4}
              placeholder="SELECT * FROM media LIMIT 10"
              spellCheck={false}
            />
            <Button onClick={handleRunSql} disabled={sqlRunning}>
              {sqlRunning ? "Running…" : "Run"}
            </Button>
            {sqlError && (
              <Alert variant="danger" role="alert">
                <p>{sqlError}</p>
              </Alert>
            )}
            {sqlResult && (
              <div className="admin-page__sql-result">
                {sqlResult.type === "select" ? (
                  <div className="admin-page__sql-table-wrap">
                    <table className="admin-page__sql-table">
                      <thead>
                        <tr>
                          {sqlResult.columns.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sqlResult.rows.map((row, i) => (
                          <tr key={i}>
                            {sqlResult.columns.map((c) => (
                              <td key={c}>{row[c] == null ? "NULL" : String(row[c])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="admin-page__sql-meta">
                      {sqlResult.rows.length} row{sqlResult.rows.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                ) : (
                  <p className="admin-page__sql-meta">
                    {sqlResult.changes} row(s) affected
                    {sqlResult.lastInsertRowid > 0 &&
                      `, last insert id: ${sqlResult.lastInsertRowid}`}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
