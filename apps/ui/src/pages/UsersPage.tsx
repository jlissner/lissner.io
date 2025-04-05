import { useEffect, useState } from "react";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../api/users";
import type { CreateUserData, PaginatedUsers, UpdateUserData, User } from "@lissner/types";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editingUser, setEditingUser] = useState<User>();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    name: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setIsLoading(true);
      setError(undefined);
      const result = await getUsers(10, lastEvaluatedKey);
      setUsers(result.users);
      setLastEvaluatedKey(result.lastEvaluatedKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(undefined);
      const newUser = await createUser(formData);
      setUsers((prev) => [...prev, newUser]);
      setIsCreating(false);
      setFormData({ email: "", name: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setError(undefined);
      const updatedUser = await updateUser(editingUser.id, {
        name: formData.name,
      });
      setUsers((prev) =>
        prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
      );
      setEditingUser(undefined);
      setFormData({ email: "", name: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      setError(undefined);
      await deleteUser(id);
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  function handleEditUser(user: User) {
    setEditingUser(user);
    setFormData({ email: user.email, name: user.name || "" });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="animate-spin rounded-full" style={{ width: '48px', height: '48px', borderBottom: '2px solid var(--blue)' }}></div>
      </div>
    );
  }

  return (
    <div className="p-md" style={{ maxWidth: '1024px', margin: '0 auto' }}>
      <div className="flex justify-between items-center mb-lg">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--grey-dark)' }}>Users</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="btn btn-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="text-sm" style={{ width: '16px', height: '16px' }} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create User
        </button>
      </div>

      {error && (
        <div className="bg-red p-md rounded mb-md" style={{ borderLeft: '4px solid var(--red)' }}>
          <div className="flex items-center gap-sm">
            <svg className="text-white" style={{ width: '16px', height: '16px' }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-white text-sm">{error}</p>
          </div>
        </div>
      )}

      {(isCreating || editingUser) && (
        <form
          onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
          className="card p-md mb-lg"
        >
          <h2 className="text-lg font-semibold mb-md text-black">
            {editingUser ? "Edit User" : "Create User"}
          </h2>
          <div className="flex flex-col gap-sm">
            <div>
              <label className="text-sm font-medium text-black mb-xs block">Email:</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                disabled={!!editingUser}
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-black mb-xs block">Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-sm mt-md">
            <button
              type="submit"
              className="btn btn-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="text-sm" style={{ width: '16px', height: '16px' }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {editingUser ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingUser(undefined);
                setIsCreating(false);
                setFormData({ email: "", name: "" });
              }}
              className="btn bg-grey text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="text-sm" style={{ width: '16px', height: '16px' }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-sm">
        {users.map((user) => (
          <div
            key={user.id}
            className="card p-md flex justify-between items-center"
          >
            <div>
              <h3 className="text-base font-medium" style={{ color: 'var(--grey-dark)' }}>{user.email}</h3>
              {user.name && (
                <p className="text-base mt-0.5" style={{ color: 'var(--grey)' }}>{user.name}</p>
              )}
            </div>
            <div className="flex gap-sm">
              <button
                onClick={() => handleEditUser(user)}
                className="btn btn-warning"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="text-sm" style={{ width: '14px', height: '14px' }} viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => handleDeleteUser(user.id)}
                className="btn btn-danger"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="text-sm" style={{ width: '14px', height: '14px' }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {lastEvaluatedKey && (
        <div className="flex justify-center mt-lg">
          <button
            onClick={loadUsers}
            className="btn btn-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="text-sm" style={{ width: '16px', height: '16px' }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Load More
          </button>
        </div>
      )}
    </div>
  );
} 