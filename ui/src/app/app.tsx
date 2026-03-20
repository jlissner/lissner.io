import { LoginPage } from "@/features/auth/components/login-page";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { AppProvider } from "./provider";
import { AuthenticatedApp } from "./authenticated-app";

export default function App() {
  const { loading, needsLogin, refresh } = useAuth();

  if (loading) {
    return <div className="app app--loading">Loading…</div>;
  }

  if (needsLogin) {
    return <LoginPage onSent={refresh} />;
  }

  return (
    <AppProvider>
      <AuthenticatedApp />
    </AppProvider>
  );
}
