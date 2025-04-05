import { afetch } from "./utils";
import type { CreateUserData, PaginatedUsers, UpdateUserData, User } from "@lissner/types";

const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  throw new Error(
    "VITE_API_URL environment variable is not set. Please check your .env file.",
  );
}

const USERS_API = `${API_URL}/dynamodb/users`;

export async function getUsers(limit = 10, lastEvaluatedKey?: string): Promise<PaginatedUsers> {
  const url = new URL(USERS_API);
  url.searchParams.append("limit", limit.toString());
  if (lastEvaluatedKey) {
    url.searchParams.append("lastEvaluatedKey", encodeURIComponent(lastEvaluatedKey));
  }

  const response = await afetch(url.toString());
  if (!response.ok) {
    throw new Error("Failed to fetch users");
  }
  return response.json();
}

export async function getUserById(id: string): Promise<User> {
  const response = await afetch(`${USERS_API}/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }
  return response.json();
}

export async function getUserByEmail(email: string): Promise<User> {
  const response = await afetch(`${USERS_API}/email/${email}`);
  if (!response.ok) {
    throw new Error("Failed to fetch user");
  }
  return response.json();
}

export async function createUser(data: CreateUserData): Promise<User> {
  const response = await afetch(USERS_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to create user");
  }
  return response.json();
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const response = await afetch(`${USERS_API}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update user");
  }
  return response.json();
}

export async function deleteUser(id: string): Promise<void> {
  const response = await afetch(`${USERS_API}/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete user");
  }
} 