import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  addWhitelistEntry,
  listPeopleForAdmin,
  listUsers,
  listWhitelist,
  removeWhitelistEntry,
  type AdminUser,
  type AdminWhitelistEntry,
} from "../../api";

type AdminPersonOption = { id: number; name: string };

export function WhitelistTab() {
  const [whitelist, setWhitelist] = useState<AdminWhitelistEntry[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [people, setPeople] = useState<AdminPersonOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newPersonId, setNewPersonId] = useState<number | "">("");

  const fetchData = useCallback(async () => {
    setLoadError(null);
    try {
      const [wl, usersData, peopleData] = await Promise.all([
        listWhitelist(),
        listUsers(),
        listPeopleForAdmin(),
      ]);
      setWhitelist(wl);
      setUsers(usersData);
      setPeople(peopleData);
    } catch (err) {
      setLoadError(
        err instanceof ApiError ? err.message : "Failed to load whitelist",
      );
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      await addWhitelistEntry({
        email: newEmail.trim(),
        isAdmin: newIsAdmin,
        personId: newPersonId !== "" ? newPersonId : undefined,
      });
      setNewEmail("");
      setNewIsAdmin(false);
      setNewPersonId("");
      await fetchData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to add";
      alert(message);
    }
  };

  const handleRemoveWhitelist = async (id: number) => {
    if (!confirm("Remove from whitelist?")) return;
    try {
      await removeWhitelistEntry(id);
      await fetchData();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to remove";
      alert(message);
    }
  };

  return (
    <div
      id="admin-panel-whitelist"
      role="tabpanel"
      aria-labelledby="admin-tab-whitelist"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>Whitelist</h3>
        <p className="admin-page__desc">
          Only whitelisted emails can receive magic links. Add users here to
          grant access.
        </p>
        {loadError && (
          <Alert variant="danger" role="alert">
            <p>{loadError}</p>
          </Alert>
        )}
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
              setNewPersonId(
                e.target.value === "" ? "" : parseInt(e.target.value, 10),
              )
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
              w.personId != null
                ? people.find((p) => p.id === w.personId)
                : null;
            return (
              <li key={w.id} className="admin-page__list-item">
                <span>{w.email}</span>
                {w.isAdmin && <span className="admin-page__badge">admin</span>}
                {assignedPerson && (
                  <span className="admin-page__meta">
                    → {assignedPerson.name}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveWhitelist(w.id)}
                >
                  Remove
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
