import { UnauthenticatedLayout, useUser } from "@lissner/ui-utils";
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
