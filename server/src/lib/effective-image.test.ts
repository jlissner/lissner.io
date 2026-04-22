import { describe, expect, it } from "vitest";
import {
  isEffectiveImageItem,
  isGenericBinaryMime,
  isPixelMotionPhotoExtension,
  sniffMediaMimeFromBuffer,
} from "./effective-image.js";

describe("isPixelMotionPhotoExtension", () => {
  it("detects .mp sidecar extension", () => {
    expect(isPixelMotionPhotoExtension("foo.mp")).toBe(true);
    expect(isPixelMotionPhotoExtension("FOO.MP")).toBe(true);
    expect(isPixelMotionPhotoExtension("foo.jpg")).toBe(false);
  });
});

describe("isGenericBinaryMime", () => {
  it("treats octet-stream and empty as generic", () => {
    expect(isGenericBinaryMime("application/octet-stream")).toBe(true);
    expect(isGenericBinaryMime("binary/octet-stream")).toBe(true);
    expect(isGenericBinaryMime("")).toBe(true);
    expect(isGenericBinaryMime("image/jpeg")).toBe(false);
  });
});

describe("isEffectiveImageItem", () => {
  it("classifies by mime and pixel .mp extension", () => {
    expect(
      isEffectiveImageItem({ mimeType: "image/jpeg", originalName: "a.jpg" }),
    ).toBe(true);
    expect(
      isEffectiveImageItem({ mimeType: "video/mp4", originalName: "a.mp4" }),
    ).toBe(false);
    expect(
      isEffectiveImageItem({
        mimeType: "application/octet-stream",
        originalName: "a.mp",
      }),
    ).toBe(true);
  });
});

describe("sniffMediaMimeFromBuffer", () => {
  it("detects JPEG, PNG, MP4 ftyp at byte 4, and WebM", () => {
    const jpeg = Buffer.alloc(12, 0);
    jpeg[0] = 0xff;
    jpeg[1] = 0xd8;
    jpeg[2] = 0xff;
    jpeg[3] = 0xe0;
    expect(sniffMediaMimeFromBuffer(jpeg)).toBe("image/jpeg");

    const png = Buffer.alloc(12, 0);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffMediaMimeFromBuffer(png)).toBe("image/png");

    const mp4 = Buffer.alloc(32);
    mp4.write("ftyp", 4);
    expect(sniffMediaMimeFromBuffer(mp4)).toBe("video/mp4");

    const webm = Buffer.alloc(12, 0);
    webm[0] = 0x1a;
    webm[1] = 0x45;
    webm[2] = 0xdf;
    webm[3] = 0xa3;
    expect(sniffMediaMimeFromBuffer(webm)).toBe("video/webm");
  });

  it("scans for ftyp box when not at fixed header offset", () => {
    const buf = Buffer.alloc(64);
    buf.write("junk", 0);
    buf.write("ftyp", 20);
    expect(sniffMediaMimeFromBuffer(buf)).toBe("video/mp4");
  });

  it("returns null when inconclusive", () => {
    expect(sniffMediaMimeFromBuffer(Buffer.alloc(4))).toBe(null);
    expect(sniffMediaMimeFromBuffer(Buffer.from("hello world"))).toBe(null);
  });
});
