import { useCallback, useRef } from "react";

const TAP_ZONE_FRACTION = 0.3;
const TAP_MOVE_THRESHOLD = 10;
const TAP_TIME_THRESHOLD = 300;

export function useTapNav(
  onTapLeft: (() => void) | null,
  onTapRight: (() => void) | null,
  onTapCenter: (() => void) | null,
): {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
} {
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!startRef.current) return;
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - startRef.current.x);
      const dy = Math.abs(t.clientY - startRef.current.y);
      const dt = Date.now() - startRef.current.t;
      startRef.current = null;

      if (
        dx > TAP_MOVE_THRESHOLD ||
        dy > TAP_MOVE_THRESHOLD ||
        dt > TAP_TIME_THRESHOLD
      )
        return;

      const x = t.clientX;
      const w = window.innerWidth;

      if (x < w * TAP_ZONE_FRACTION && onTapLeft) {
        onTapLeft();
      } else if (x > w * (1 - TAP_ZONE_FRACTION) && onTapRight) {
        onTapRight();
      } else if (onTapCenter) {
        onTapCenter();
      }
    },
    [onTapLeft, onTapRight, onTapCenter],
  );

  return { onTouchStart, onTouchEnd };
}
