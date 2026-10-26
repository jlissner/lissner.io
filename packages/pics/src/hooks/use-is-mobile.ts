import { useEffect, useState } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 639px)";

/** True when the viewport is at the mobile breakpoint (<640px), kept in sync with resizes. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}
