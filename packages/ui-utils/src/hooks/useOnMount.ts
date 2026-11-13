import { useLayoutEffect } from "react";

export function useOnMount(cb: () => void) {
  useLayoutEffect(cb, []);
}
