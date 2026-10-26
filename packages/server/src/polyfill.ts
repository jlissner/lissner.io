import { createRequire } from "module";

/*
 * right now we must polyfill
 * util.isNullOrUndefined and utl.isArray
 * because @tensorflow/tfjs-node v 4.22.0 relies on it
 * and it was removed in node v23.
 **/

const require = createRequire(import.meta.url);
const nodeUtil = require("util") as Record<string, unknown>;

if (typeof nodeUtil["isNullOrUndefined"] !== "function") {
  nodeUtil["isNullOrUndefined"] = (v: unknown) => v === null || v === undefined;
}

if (typeof nodeUtil["isArray"] !== "function") {
  nodeUtil["isArray"] = Array.isArray;
}
