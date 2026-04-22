import { useState, useEffect } from "react";
import { ApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sendMagicLink, verifyLoginCode } from "../api";

interface LoginPageProps {
  onSent?: () => void;
  onAuthenticated?: () => void;
}

const EMAIL_KEY = "pending_login_email";

export function LoginPage({ onSent, onAuthenticated }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "verifying" | "error">("idle");
  const [error, setError] = useState("");
  const [codeError, setCodeError] = useState("");

  const params = new URLSearchParams(window.location.search);
  const urlCode = params.get("code");

  useEffect(() => {
    if (urlCode && urlCode.length === 6 && status === "idle") {
      const storedEmail = localStorage.getItem(EMAIL_KEY);
      if (storedEmail) {
        setStatus("verifying");
        verifyLoginCode(storedEmail, urlCode)
          .then(() => {
            localStorage.removeItem(EMAIL_KEY);
            onAuthenticated?.();
            window.location.reload();
          })
          .catch(() => {
            localStorage.removeItem(EMAIL_KEY);
            setStatus("error");
            setCodeError("Invalid or expired code");
          });
      } else {
        setStatus("error");
        setCodeError("No pending login. Request a new magic link.");
      }
      window.history.replaceState({}, "", "/");
    }
  }, [urlCode, status, onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sent");
    setError("");

    try {
      localStorage.setItem(EMAIL_KEY, email);
      await sendMagicLink(email);
      onSent?.();
    } catch (err) {
      localStorage.removeItem(EMAIL_KEY);
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Network error");
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-page__title">Family Media Manager</h1>
      <p className="login-page__subtitle">Sign in with a magic link sent to your email</p>

      {status === "sent" ? (
        <div>
          <Alert variant="success">
            <p>Check your email for the magic link. The link expires in 15 minutes.</p>
            <p className="login-page__hint">
              No email configured? Check the server console for the code.
            </p>
          </Alert>
          <Button
            variant="ghost"
            onClick={() => {
              setStatus("idle");
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
          <Button type="submit" disabled={status === "verifying"}>
            Send magic link
          </Button>
          {status === "error" && (
            <p id="login-error" className="login-page__error">
              {error || codeError}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
