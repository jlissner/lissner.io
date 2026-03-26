import { useState } from "react";
import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendMagicLink } from "../api";

interface LoginPageProps {
  onSent?: () => void;
}

export function LoginPage({ onSent }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const urlError = params.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");

    try {
      await sendMagicLink(email);
      setStatus("sent");
      onSent?.();
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Network error");
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-page__title">Family Media Manager</h1>
      <p className="login-page__subtitle">Sign in with a magic link sent to your email</p>

      {urlError === "invalid_token" && (
        <Alert variant="danger" role="alert">
          <p>That link has expired or was already used. Request a new one below.</p>
        </Alert>
      )}

      {status === "sent" ? (
        <Alert variant="success">
          <p>Check your email for the magic link. It expires in 15 minutes.</p>
          <p className="login-page__hint">
            No email configured? Check the server console for the link.
          </p>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="login-page__form">
          <label htmlFor="login-email" className="u-sr-only">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form__input"
            autoComplete="email"
            aria-describedby={status === "error" ? "login-error" : undefined}
          />
          <Button type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send magic link"}
          </Button>
          {status === "error" && (
            <p id="login-error" className="login-page__error">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
