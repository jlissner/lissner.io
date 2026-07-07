import {
  isImageMime,
  isPdfMime,
  isTextDocument,
  isVideoMime,
} from "../../lib/media-mime.js";

/** Pixel motion-photo sidecars often use `.mp`; payload may be JPEG or MP4. */
export function isPixelMotionPhotoBasename(originalName: string): boolean {
  const base = originalName.replace(/^.*[/\\]/, "");
  return /\.mp$/i.test(base);
}

export function isImage(mimeType: string, originalName?: string): boolean {
  if (isImageMime(mimeType)) return true;
  if (
    originalName != null &&
    originalName !== "" &&
    isPixelMotionPhotoBasename(originalName)
  ) {
    return true;
  }
  return false;
}

export function isVideo(mimeType: string): boolean {
  return isVideoMime(mimeType);
}

export function isText(mimeType: string, originalName: string): boolean {
  return isTextDocument({ mimeType, originalName });
}

export function isPdf(mimeType: string): boolean {
  return isPdfMime(mimeType);
}
