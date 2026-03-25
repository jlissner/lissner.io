import path from "path";
import { open } from "fs/promises";

/**
 * Google Pixel motion-photo companion files sometimes use a `.mp` extension with a generic MIME
 * (e.g. `application/octet-stream`) even though the payload starts as a normal JPEG.
 */
export function isPixelMotionPhotoExtension(originalName: string): boolean {
  return /\.mp$/i.test(path.extname(originalName));
}

export function isEffectiveImageItem(item: { mimeType: string; originalName: string }): boolean {
  if (item.mimeType.startsWith("image/")) return true;
  if (item.mimeType.startsWith("video/")) return false;
  return isPixelMotionPhotoExtension(item.originalName);
}

/** Content-Type for image responses when DB MIME is generic but file is image-like (e.g. `.mp`). */
export function effectiveImageResponseMimeType(item: {
  mimeType: string;
  originalName: string;
}): string {
  if (item.mimeType.startsWith("image/")) return item.mimeType;
  if (item.mimeType.startsWith("video/")) return item.mimeType;
  if (isEffectiveImageItem(item)) return "image/jpeg";
  return item.mimeType;
}

export function isGenericBinaryMime(mimeType: string): boolean {
  return (
    mimeType === "application/octet-stream" ||
    mimeType === "binary/octet-stream" ||
    !mimeType
  );
}

/**
 * Detect image/video from file header. Pixel `.mp` sidecars are often ISO MP4 (video), not JPEG.
 */
export function sniffMediaMimeFromBuffer(head: Buffer): string | null {
  if (head.length < 12) return null;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    head[4] === 0x66 &&
    head[5] === 0x74 &&
    head[6] === 0x79 &&
    head[7] === 0x70
  ) {
    return "video/mp4";
  }
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return "video/webm";
  }
  const scanLen = Math.min(head.length, 65536);
  for (let i = 4; i <= scanLen - 4; i++) {
    if (
      head[i] === 0x66 &&
      head[i + 1] === 0x74 &&
      head[i + 2] === 0x79 &&
      head[i + 3] === 0x70
    ) {
      return "video/mp4";
    }
  }
  return null;
}

async function readFileHead(absolutePath: string, byteLength: number): Promise<Buffer> {
  const fh = await open(absolutePath, "r");
  try {
    const buf = Buffer.alloc(byteLength);
    const { bytesRead } = await fh.read(buf, 0, byteLength, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

export async function sniffMediaMimeFromFile(absolutePath: string): Promise<string | null> {
  const head = await readFileHead(absolutePath, 65536);
  return sniffMediaMimeFromBuffer(head);
}

/**
 * Correct MIME for upload when multer reports octet-stream or for `.mp` Pixel motion-photo files.
 */
export async function resolveMimeTypeAfterUpload(
  originalName: string,
  multerMimeType: string,
  absoluteFilePath: string
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  const genericMime =
    !multerMimeType ||
    multerMimeType === "application/octet-stream" ||
    multerMimeType === "binary/octet-stream";

  const shouldSniff = ext === ".mp" || genericMime;
  if (shouldSniff) {
    try {
      const sniffed = await sniffMediaMimeFromFile(absoluteFilePath);
      if (sniffed) return sniffed;
    } catch {
      // fall through
    }
    if (ext === ".mp") {
      return "image/jpeg";
    }
  }
  return multerMimeType || "application/octet-stream";
}
