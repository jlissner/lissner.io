export function isVideoMime(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isTextMime(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

