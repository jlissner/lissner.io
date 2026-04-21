import { useRef, useEffect, type RefObject } from "react";

const SWIPE_THRESHOLD = 50;

export function useSwipeNav(
  ref: RefObject<HTMLElement | null>,
  onSwipeLeft: (() => void) | null,
  onSwipeRight: (() => void) | null
): void {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      touchStart.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) return;

      if (dx < 0 && onSwipeLeft) onSwipeLeft();
      if (dx > 0 && onSwipeRight) onSwipeRight();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight]);
}
