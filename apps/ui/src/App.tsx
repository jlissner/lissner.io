import { useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { NavBar } from "./components/NavBar";
import { LoginPage } from "./pages/LoginPage";
import { StyleGuide } from "./pages/StyleGuide";
import { userAtom } from "./state/userAtom";

function App() {
  const user = useAtomValue(loadable(userAtom));

  if (user.state === "loading") {
    return "loading";
  }

  if (user.state === "hasData") {
    return (
      <>
        <NavBar />
        <pre>{JSON.stringify(user.data, null, 2)}</pre>
        <StyleGuide />
      </>
    );
  }

  return <LoginPage />;
}

export default App;
