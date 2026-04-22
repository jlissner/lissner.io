import sharp from "sharp";

export async function computePerceptualHash(filePath: string): Promise<Buffer> {
  const resized = await sharp(filePath)
    .resize(8, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
  return resized;
}

export function hammingDistance(a: Buffer, b: Buffer): number {
  if (a.length !== b.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let x = a[i] ^ b[i];
    while (x > 0) {
      distance += x & 1;
      x >>= 1;
    }
  }
  return distance;
}

export function hammingDistanceFromHashes(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    let x = a.charCodeAt(i) ^ b.charCodeAt(i);
    while (x > 0) {
      distance += x & 1;
      x >>= 1;
    }
  }
  return distance;
}
