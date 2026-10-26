import { useEffect, useState } from "react";

export function useMatchMaxWidth(maxWidthPx: number): boolean {
  const query = `(max-width: ${maxWidthPx}px)`;
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (): void => {
      setMatches(media.matches);
    };
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
