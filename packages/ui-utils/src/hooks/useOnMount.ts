import { useLayoutEffect, useRef } from "react";

export function useOnMount(cb: () => void) {
  const ref = useRef(cb);

  useLayoutEffect(() => {
    ref.current();
  }, []);
}
