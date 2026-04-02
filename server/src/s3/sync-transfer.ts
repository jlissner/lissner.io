import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream, createWriteStream } from "fs";
import { access, rename, unlink } from "fs/promises";
import type { Readable } from "stream";
import { pipeline } from "stream/promises";

export async function listAllS3Keys(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<Set<string>> {
  const keys = new Set<string>();
  const collect = async (continuationToken: string | undefined): Promise<void> => {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.add(obj.Key);
    }
    if (res.NextContinuationToken) await collect(res.NextContinuationToken);
  };
  await collect(undefined);
  return keys;
}

export function fileExists(filePath: string): Promise<boolean> {
  return access(filePath)
    .then(() => true)
    .catch(() => false);
}

function isNodeReadableStream(body: unknown): body is Readable {
  return typeof (body as Readable | null)?.pipe === "function";
}

export async function downloadS3ObjectToFile(body: unknown, targetPath: string): Promise<void> {
  if (!isNodeReadableStream(body)) {
    throw new Error("S3 GetObject Body was not a Node.js readable stream");
  }
  const tmpPath = `${targetPath}.tmp-${Date.now()}`;
  await pipeline(body, createWriteStream(tmpPath));
  // Atomic replace on same filesystem.
  await unlink(targetPath).catch(() => {});
  await rename(tmpPath, targetPath);
}

/** S3 multipart upload from disk — avoids loading the whole file into a Buffer (Node ~2GiB cap) and supports objects >5GiB. */
export async function uploadLocalFileToS3(
  client: S3Client,
  bucket: string,
  key: string,
  filePath: string
): Promise<void> {
  const body = createReadStream(filePath);
  const upload = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
    },
    queueSize: 4,
    partSize: 8 * 1024 * 1024,
  });
  await upload.done();
}
