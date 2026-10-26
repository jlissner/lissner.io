/**
 * Convention: domain services return `{ ok: true, ... } | { ok: false, reason: ... }` for expected
 * outcomes. Reserve `throw` for programmer errors and unexpected I/O; map failures to HTTP in routes.
 */
export type ServiceFailure<R extends string = string> = {
  ok: false;
  reason: R;
};
