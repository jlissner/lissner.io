import { useAtom } from "jotai";
import { useState } from "react";
import { userTokenAtom } from "../state/userAtom";
import "../styles/navbar.css";

type ColorScheme = "light" | "dark";
function useColorScheme(): [ColorScheme, () => void] {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(
    (document.documentElement.style.colorScheme as ColorScheme) || "dark",
  );
  const nextColorScheme = colorScheme === "dark" ? "light" : "dark";

  function toggleColorScheme() {
    document.documentElement.style.colorScheme = nextColorScheme;

    setColorScheme(nextColorScheme);
  }

  return [nextColorScheme, toggleColorScheme];
}

export function NavBar() {
  const [userToken, setUserToken] = useAtom(userTokenAtom);
  const [nextScheme, toggleColorScheme] = useColorScheme();

  return (
    <nav className="navbar">
      <h2>Lissner Family Website</h2>

      <button onClick={toggleColorScheme}>
        {nextScheme === "light" ? "☀️" : "🌑"}
      </button>
      <button
        disabled={!userToken}
        onClick={() => {
          setUserToken(undefined);
        }}
      >
        logout
      </button>
    </nav>
  );
}
