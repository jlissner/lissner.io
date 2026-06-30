import { useEffect, useRef, type RefObject } from "react";

const SWIPE_THRESHOLD = 50;
const TAP_MOVE_THRESHOLD = 12;
const TAP_TIME_THRESHOLD = 350;
const TAP_ZONE_FRACTION = 0.25;

function shouldIgnoreGestureTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return !!target.closest(
    "button, a, input, textarea, select, label, video, iframe, [data-viewer-gesture-ignore]",
  );
}

interface ViewerGesturesOptions {
  enabled: boolean;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}

/** Swipe and edge-tap navigation for the photo area on touch devices. */
export function useViewerGestures(
  ref: RefObject<HTMLElement | null>,
  { enabled, onPrev, onNext }: ViewerGesturesOptions,
): void {
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  onPrevRef.current = onPrev;
  onNextRef.current = onNext;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const touchStart = {
      current: null as { x: number; y: number; t: number } | null,
    };

    const onTouchStart = (e: TouchEvent) => {
      if (shouldIgnoreGestureTarget(e.target)) {
        touchStart.current = null;
        return;
      }
      const t = e.touches[0];
      touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current || shouldIgnoreGestureTarget(e.target)) {
        touchStart.current = null;
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.current.x;
      const dy = t.clientY - touchStart.current.y;
      const dt = Date.now() - touchStart.current.t;
      touchStart.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx >= SWIPE_THRESHOLD && absDx > absDy) {
        if (dx < 0) onNextRef.current?.();
        else onPrevRef.current?.();
        return;
      }

      if (
        absDx > TAP_MOVE_THRESHOLD ||
        absDy > TAP_MOVE_THRESHOLD ||
        dt > TAP_TIME_THRESHOLD
      ) {
        return;
      }

      const x = t.clientX;
      const rect = el.getBoundingClientRect();
      const relX = x - rect.left;
      if (relX < rect.width * TAP_ZONE_FRACTION) onPrevRef.current?.();
      else if (relX > rect.width * (1 - TAP_ZONE_FRACTION))
        onNextRef.current?.();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref, enabled]);
}
