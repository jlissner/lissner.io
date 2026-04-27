import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { thumbnailFilenameToMediaId } from "../lib/orphan-thumbnails.js";
import { S3_PREFIX } from "./sync-constants.js";

/** Remove orphan thumbnail objects under `backup/thumbnails/` (video `{id}.jpg`, image `{id}_thumb.jpg`). */
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
    const id = thumbnailFilenameToMediaId(name);
    if (id == null) continue;
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
