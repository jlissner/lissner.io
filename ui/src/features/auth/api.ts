import { apiJson } from "@/api/client";

export function sendMagicLink(email: string): Promise<{ ok: true }> {
  return apiJson<{ ok: true }>("auth/magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export function verifyLoginCode(email: string, code: string): Promise<{ ok: true }> {
  return apiJson<{ ok: true }>("auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });
}
