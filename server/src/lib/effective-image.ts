import path from "path";
import { open } from "fs/promises";

/**
 * Google Pixel motion-photo companion files sometimes use a `.mp` extension with a generic MIME
 * (e.g. `application/octet-stream`) even though the payload starts as a normal JPEG.
 */
export function isPixelMotionPhotoExtension(originalName: string): boolean {
  return /\.mp$/i.test(path.extname(originalName));
}

export function isEffectiveImageItem(item: {
  mimeType: string;
  originalName: string;
}): boolean {
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
  if (
    head[0] === 0x1a &&
    head[1] === 0x45 &&
    head[2] === 0xdf &&
    head[3] === 0xa3
  ) {
    return "video/webm";
  }
  const scanLen = Math.min(head.length, 65536);
  const ftypAnchors = Array.from(
    { length: Math.max(0, scanLen - 7) },
    (_, k) => k + 4,
  );
  for (const i of ftypAnchors) {
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

async function readFileHead(
  absolutePath: string,
  byteLength: number,
): Promise<Buffer> {
  const fh = await open(absolutePath, "r");
  try {
    const buf = Buffer.alloc(byteLength);
    const { bytesRead } = await fh.read(buf, 0, byteLength, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

async function sniffMediaMimeFromFile(
  absolutePath: string,
): Promise<string | null> {
  const head = await readFileHead(absolutePath, 65536);
  return sniffMediaMimeFromBuffer(head);
}

/** Result of sniffing a local media file that might need DB `mime_type` correction. */
type SniffMediaMimePersistResult = {
  /** Raw sniff result, or `null` if sniffing was skipped or inconclusive. */
  sniffed: string | null;
  /** `true` when `persist` ran because sniff differed from the row. */
  persistedUpdate: boolean;
  /** MIME for preview download (`sniffed` wins, else effective image MIME for generic `.mp` rows). */
  mimeTypePreview: string;
  /** MIME for video vs image detection (`sniffed` wins, else stored row `mime_type`). */
  mimeTypeForKind: string;
};

/**
 * If the row looks like a Pixel `.mp` sidecar or generic binary MIME, sniff the file and optionally
 * persist a corrected `mime_type`. Shared by preview and thumbnail paths.
 */
export async function sniffAndPersistMediaMime(
  item: { id: string; mimeType: string; originalName: string },
  absoluteFilePath: string,
  persist: (mediaId: string, mime: string) => void,
): Promise<SniffMediaMimePersistResult> {
  const shouldSniff =
    isPixelMotionPhotoExtension(item.originalName) ||
    isGenericBinaryMime(item.mimeType);
  if (!shouldSniff) {
    const mimeTypePreview = effectiveImageResponseMimeType(item);
    return {
      sniffed: null,
      persistedUpdate: false,
      mimeTypePreview,
      mimeTypeForKind: item.mimeType,
    };
  }
  const sniffed = await sniffMediaMimeFromFile(absoluteFilePath);
  if (sniffed == null) {
    return {
      sniffed: null,
      persistedUpdate: false,
      mimeTypePreview: effectiveImageResponseMimeType(item),
      mimeTypeForKind: item.mimeType,
    };
  }
  if (sniffed !== item.mimeType) {
    persist(item.id, sniffed);
    return {
      sniffed,
      persistedUpdate: true,
      mimeTypePreview: sniffed,
      mimeTypeForKind: sniffed,
    };
  }
  return {
    sniffed,
    persistedUpdate: false,
    mimeTypePreview: sniffed,
    mimeTypeForKind: sniffed,
  };
}

/**
 * Correct MIME for upload when multer reports octet-stream or for `.mp` Pixel motion-photo files.
 */
export async function resolveMimeTypeAfterUpload(
  originalName: string,
  multerMimeType: string,
  absoluteFilePath: string,
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
