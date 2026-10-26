export type NavDirection = "prev" | "next";

export function resolveSwipeNav(
  dx: number,
  dy: number,
  threshold = 50,
): NavDirection | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx >= threshold && absDx > absDy) {
    return dx < 0 ? "next" : "prev";
  }
  return null;
}

export function isTapGesture(
  dx: number,
  dy: number,
  dt: number,
  moveThreshold = 12,
  timeThreshold = 350,
): boolean {
  return (
    Math.abs(dx) <= moveThreshold &&
    Math.abs(dy) <= moveThreshold &&
    dt <= timeThreshold
  );
}

export function resolveEdgeTapNav(
  relX: number,
  width: number,
  zoneFraction = 0.25,
): NavDirection | null {
  if (width <= 0) return null;
  if (relX < width * zoneFraction) return "prev";
  if (relX > width * (1 - zoneFraction)) return "next";
  return null;
}
