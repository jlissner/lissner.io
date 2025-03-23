import { LoginForm } from "../forms/loginForm";
import { useTokenExchange } from "../hooks/useTokenExchange";
import "../styles/login-page.css";

export function LoginPage() {
  const code = useTokenExchange();

  if (code) {
    return <h2>Loggin in</h2>;
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
