/** Allowed browser Origins for split UI (lissner.io) + API (api.lissner.io) hosting. */

export function isAllowedLissnerCorsOrigin(
  originHeader: string | undefined,
  strictHttps: boolean,
): boolean {
  if (originHeader === undefined || originHeader === "") {
    return false;
  }
  if (originHeader === "null") {
    return false;
  }

  const parsed = safeParseOriginUrl(originHeader);
  if (!parsed) {
    return false;
  }

  if (strictHttps && parsed.protocol !== "https:") {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "lissner.io") {
    return true;
  }
  if (host.endsWith(".lissner.io")) {
    return true;
  }
  return false;
}

function safeParseOriginUrl(origin: string): URL | null {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

export function corsStrictHttpsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.BDD_STRICT_CORS === "1"
  );
}
