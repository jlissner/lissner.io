import { Modal, SignInForm, UserMenu } from "../components";
import { useUser, useOnMount, useLocalStorage } from "../hooks";

export function Header() {
  const user = useUser();
  const [colorScheme, setColorScheme] = useLocalStorage("color-scheme", "dark");
  const isDarkMode = colorScheme === "dark";

  useOnMount(() => {
    if (colorScheme) {
      document.documentElement.style.colorScheme = colorScheme;
    }
  });

  function toggleDarkMode() {
    const nextValue = isDarkMode ? "light" : "dark";

    document.documentElement.style.colorScheme = nextValue;

    setColorScheme(nextValue);
  }

  return (
    <header>
      <a href="/">lissner.io</a>

      <button onClick={toggleDarkMode}>{isDarkMode ? "☀️" : "🌙"}</button>
      {user && <UserMenu />}
      {!user && <Modal button={{ text: "Sign In" }} Component={SignInForm} />}
    </header>
  );
}
