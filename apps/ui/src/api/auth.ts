import { afetch } from "./utils";

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
  return await fetch(`http://localhost:3000/login/${code}`, {
    credentials: "include",
    method: "POST",
  }).then(x => x.text());
}

export async function getMe(): Promise<User> {
  return afetch("http://localhost:3000/me").then(x => x.json());
}
