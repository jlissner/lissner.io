import {
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: "us-west-2",
});

async function listBuckets(
  ...options: ConstructorParameters<typeof ListBucketsCommand>
) {
  const listBucketsCommand = new ListBucketsCommand(...options);
  const buckets = await s3Client.send(listBucketsCommand);

  return buckets;
}

async function listFolders(
  options?: Omit<
    ConstructorParameters<typeof ListObjectsV2Command>[0],
    "Bucket" | "Delimiter"
  >,
) {
  const listFoldersCommand = new ListObjectsV2Command({
    Bucket: "documents.lissner.io",
    Delimiter: "/",
    ...options,
  });
  const folders = await s3Client.send(listFoldersCommand);

  return folders;
}

async function listFiles(
  options: Omit<
    ConstructorParameters<typeof ListObjectsV2Command>[0],
    "Bucket" | "Delimiter"
  >,
) {
  const listFilesCommand = new ListObjectsV2Command({
    Bucket: "documents.joelissner.com",
    // Bucket: "documents.lissner.io",
    ...options,
  });
  const files = await s3Client.send(listFilesCommand);

  return files;
}

async function getPictureUrl(
  options: Omit<
    ConstructorParameters<typeof GetObjectCommand>[0],
    "Bucket" | "Delimiter"
  >,
) {
  const getPictureCommand = new GetObjectCommand({
    Bucket: "documents.joelissner.com",
    // Bucket: "documents.lissner.io",
    ...options,
  });
  const pictureUrl = getSignedUrl(s3Client, getPictureCommand, {
    expiresIn: 3600,
  });

  return pictureUrl;
}

export const s3 = {
  listBuckets,
  listFolders,
  listFiles,
  getPictureUrl,
};
