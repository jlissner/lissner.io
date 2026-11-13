import { useState } from "react";

export function useLocalStorage(
  key: string,
  defaultValue?: string,
): [string | undefined, (v: string) => void] {
  const [value, setValue] = useState(
    () => localStorage.getItem(key) ?? defaultValue,
  );

  function setLocalStorageValue(newValue: string) {
    localStorage.setItem(key, newValue);

    setValue(newValue);
  }

  return [value, setLocalStorageValue];
}
