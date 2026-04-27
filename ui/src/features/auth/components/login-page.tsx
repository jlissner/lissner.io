import { useState, useEffect } from "react";
import { ApiError } from "@/api";
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
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "verifying" | "error">(
    "idle",
  );
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
    setError("");
    setCode("");
    setCodeError("");

    try {
      localStorage.setItem(EMAIL_KEY, email);
      await sendMagicLink(email);
      setStatus("sent");
      onSent?.();
    } catch (err) {
      localStorage.removeItem(EMAIL_KEY);
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Network error");
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const pendingEmail = localStorage.getItem(EMAIL_KEY) ?? email;
    if (!pendingEmail) {
      setCodeError("Missing email. Request a new magic link.");
      return;
    }
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setCodeError("Enter the 6-digit code from your email or server console.");
      return;
    }
    setCodeError("");
    setStatus("verifying");
    try {
      await verifyLoginCode(pendingEmail, trimmed);
      localStorage.removeItem(EMAIL_KEY);
      onAuthenticated?.();
      window.location.reload();
    } catch {
      setStatus("sent");
      setCodeError("Invalid or expired code");
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-page__title">Family Media Manager</h1>
      <p className="login-page__subtitle">
        Sign in with a magic link sent to your email
      </p>

      {status === "verifying" ? (
        <p className="login-page__hint" role="status" aria-live="polite">
          Signing in…
        </p>
      ) : status === "sent" ? (
        <div className="login-page__sent">
          <Alert variant="success">
            <p>
              Check your email for the magic link. The link expires in 15
              minutes.
            </p>
            <p className="login-page__hint">
              No email configured? Check the server console for the code.
            </p>
          </Alert>
          <form onSubmit={handleVerifyCode} className="login-page__form">
            <label htmlFor="login-code" className="login-page__hint">
              Or enter the 6-digit code manually
            </label>
            <input
              id="login-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setCodeError("");
              }}
              className="form__input"
              placeholder="000000"
              aria-invalid={codeError !== ""}
              aria-describedby={
                codeError !== "" ? "login-code-error" : undefined
              }
            />
            <Button type="submit" disabled={code.length !== 6}>
              Sign in with code
            </Button>
            {codeError !== "" && (
              <p id="login-code-error" className="login-page__error">
                {codeError}
              </p>
            )}
          </form>
          <Button
            variant="ghost"
            type="button"
            className="login-page__secondary-action"
            onClick={() => {
              localStorage.removeItem(EMAIL_KEY);
              setStatus("idle");
              setCode("");
              setCodeError("");
            }}
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
