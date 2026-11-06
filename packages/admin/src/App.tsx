import { useUser } from "./hooks/useUser";
import { UnauthenticatedLayout } from "./layouts/UnauthenticatedLayout";
import { StatusPage } from "./pages/StatusPage";

function App() {
  const user = useUser();

  if (!user) {
    return (
      <UnauthenticatedLayout>
        <StatusPage />
      </UnauthenticatedLayout>
    );
  }

  return "logged in!";
}

export default App;
