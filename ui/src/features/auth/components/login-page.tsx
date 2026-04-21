import { useState } from "react";
import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendMagicLink, verifyLoginCode } from "../api";

interface LoginPageProps {
  onSent?: () => void;
  onAuthenticated?: () => void;
}

export function LoginPage({ onSent, onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "verifying" | "error">("idle");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const urlError = params.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError("");

    try {
      await sendMagicLink(email);
      setStatus("sent");
      setCode("");
      setCodeError("");
      onSent?.();
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Network error");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setCodeError("");
    setStatus("verifying");

    try {
      await verifyLoginCode(email, code);
      onAuthenticated?.();
      window.location.reload();
    } catch (err) {
      setStatus("sent");
      setCodeError(err instanceof ApiError ? err.message : "Failed to verify code");
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

      {status === "sent" || status === "verifying" ? (
        <div>
          <Alert variant="success">
            <p>
              Check your email for the magic link, or enter the 6-digit code below. It expires in 15
              minutes.
            </p>
            <p className="login-page__hint">
              No email configured? Check the server console for the code.
            </p>
          </Alert>
          <form onSubmit={handleVerifyCode} className="login-page__form">
            <label htmlFor="login-code" className="u-sr-only">
              Login code
            </label>
            <input
              id="login-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
              }}
              required
              className="form__input"
              aria-describedby={codeError ? "code-error" : undefined}
              style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.25rem" }}
            />
            <Button type="submit" disabled={status === "verifying" || code.length !== 6}>
              {status === "verifying" ? "Verifying…" : "Verify code"}
            </Button>
            {codeError && (
              <p id="code-error" className="login-page__error">
                {codeError}
              </p>
            )}
          </form>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus("idle");
              setCode("");
              setCodeError("");
            }}
            style={{ marginTop: "var(--space-3)" }}
          >
            Use a different email
          </Button>
        </div>
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
