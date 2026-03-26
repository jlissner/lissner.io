import util from "util";

type UtilWithCompat = typeof util & {
  isNullOrUndefined?: (v: unknown) => boolean;
  isArray?: (v: unknown) => boolean;
};

export function applyNodeRuntimeCompat(): void {
  const utilCompat = util as UtilWithCompat;
  if (typeof utilCompat.isNullOrUndefined !== "function") {
    utilCompat.isNullOrUndefined = (v: unknown) => v === null || v === undefined;
  }
  utilCompat.isArray = Array.isArray;
}
