import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { S3Client } from "@aws-sdk/client-s3";
import { S3_PREFIX } from "./sync-constants.js";

/** Remove `backup/thumbnails/{id}.jpg` from S3 when no media row exists for `id`. */
export async function deleteOrphanS3Thumbnails(
  client: S3Client,
  bucket: string,
  thumbKeys: Set<string>,
  validMediaIds: Set<string>,
): Promise<number> {
  const prefix = `${S3_PREFIX}/thumbnails/`;
  const acc = { removed: 0 };
  for (const key of thumbKeys) {
    if (!key.startsWith(prefix)) continue;
    const name = key.slice(prefix.length);
    if (!name.endsWith(".jpg")) continue;
    const id = name.slice(0, -".jpg".length);
    if (validMediaIds.has(id)) continue;
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      acc.removed += 1;
    } catch (err) {
      console.error(
        { err, key },
        "[s3-sync] DeleteObject orphan thumbnail failed",
      );
    }
  }
  return acc.removed;
}
