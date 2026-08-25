/** Allowed browser Origins for split UI (lissner.io) + API subdomains hosting. */

const safeParseOriginUrl = (origin: string): URL | null => {
  try {
    return new URL(origin);
  } catch {
    return null;
  }
};

export const isAllowedLissnerCorsOrigin = (
  originHeader: string | undefined,
  strictHttps: boolean,
): boolean => {
  if (
    originHeader === undefined ||
    originHeader === "" ||
    originHeader === "null"
  ) {
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
  return host === "lissner.io" || host.endsWith(".lissner.io");
};

export const corsStrictHttpsEnabled = (): boolean =>
  process.env.NODE_ENV === "production" || process.env.BDD_STRICT_CORS === "1";

export const resolveLissnerCorsOrigin = (
  originHeader: string | undefined,
): string | false | undefined => {
  const strict = corsStrictHttpsEnabled();
  if (!strict) {
    return originHeader;
  }
  if (originHeader === undefined) {
    return undefined;
  }
  return isAllowedLissnerCorsOrigin(originHeader, true) ? originHeader : false;
};
