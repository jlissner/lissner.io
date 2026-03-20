import { useState } from "react";

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
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("sent");
        onSent?.();
      } else {
        setStatus("error");
        setError(data.error || "Failed to send magic link");
      }
    } catch {
      setStatus("error");
      setError("Network error");
    }
  };

  return (
    <div className="login-page">
      <h1 className="login-page__title">Family Media Manager</h1>
      <p className="login-page__subtitle">Sign in with a magic link sent to your email</p>

      {urlError === "invalid_token" && (
        <div className="alert alert--danger">
          <p>That link has expired or was already used. Request a new one below.</p>
        </div>
      )}

      {status === "sent" ? (
        <div className="alert alert--success">
          <p>Check your email for the magic link. It expires in 15 minutes.</p>
          <p className="login-page__hint">
            No email configured? Check the server console for the link.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="login-page__form">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form__input"
            autoComplete="email"
          />
          <button type="submit" className="btn btn--primary" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
          {status === "error" && <p className="login-page__error">{error}</p>}
        </form>
      )}
    </div>
  );
}
