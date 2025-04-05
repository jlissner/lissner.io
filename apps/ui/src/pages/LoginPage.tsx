import { Navigate, useLocation } from "react-router-dom";
import { LoginForm } from "../forms/loginForm";
import { useTokenExchange } from "../hooks/useTokenExchange";
import { useIsAuthenticated } from "../hooks/useIsAuthenticated";
import "../styles/login-page.css";

export function LoginPage() {
  const code = useTokenExchange();
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (isAuthenticated) {
    // If we're already on /admin, redirect to /admin/users
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/users" replace />;
    }
    // Otherwise, go back to where we came from
    return <Navigate to={location.state?.from || "/admin"} replace />;
  }

  if (code) {
    return <h2>Logging in...</h2>;
  }

  return (
    <main className="login-page">
      <div className="login-content">
        <h2>L i s s n e r F a m i l y W e b s i t e</h2>
        <LoginForm />
      </div>
      <p className="login-help">If you need help logging in, contact Joe.</p>
    </main>
  );
}
