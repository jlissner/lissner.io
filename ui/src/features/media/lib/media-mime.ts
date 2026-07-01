export { isTextDocument } from "@shared";

export function isVideoMime(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

export function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}
