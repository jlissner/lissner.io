import { afetch } from "./utils";
import type { User } from "@lissner/types";

interface PostLoginBody {
  email: string;
}

export async function sendMagicLink(body: PostLoginBody) {
  return await fetch("http://localhost:3000/login", {
    credentials: "include",
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function exchangeCodeForToken(code: string) {
  const response = await fetch(`http://localhost:3000/login/${code}`, {
    credentials: "include",
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to exchange code for token");
  }
  // The token is sent as plain text, not JSON
  return response.text();
}

export async function getMe(): Promise<User> {
  return afetch("http://localhost:3000/me").then((x) => x.json());
}
