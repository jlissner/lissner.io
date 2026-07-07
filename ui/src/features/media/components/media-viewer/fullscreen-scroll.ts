export interface NormalizedAnchor {
  x: number;
  y: number;
}

export function normalizedClickAnchor(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): NormalizedAnchor | null {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}

export function clampScrollOffset(
  anchorFraction: number,
  contentSize: number,
  viewportSize: number,
): number {
  if (contentSize <= viewportSize) return 0;
  const centered = anchorFraction * contentSize - viewportSize / 2;
  const max = contentSize - viewportSize;
  return Math.max(0, Math.min(centered, max));
}
