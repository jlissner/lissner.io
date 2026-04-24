const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "text/markdown",
  "text/csv",
]);

export function isTextMime(mimeType: string): boolean {
  return TEXT_MIME_TYPES.has(mimeType);
}

export function isVideoMime(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}
