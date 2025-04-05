import {
  GetObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  PutBucketCorsCommand,
  GetBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error("AWS_ACCESS_KEY_ID environment variable is not set");
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_SECRET_ACCESS_KEY environment variable is not set");
}

const client = new S3Client({
  region: "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = "documents.lissner.io";

// Function to check and update CORS configuration
async function ensureCorsConfiguration() {
  try {
    // Get current CORS configuration
    const getCorsCommand = new GetBucketCorsCommand({
      Bucket: BUCKET_NAME,
    });
    const currentCors = await client.send(getCorsCommand);
    console.log("Current CORS configuration:", currentCors);

    // Define desired CORS configuration
    const corsConfig = {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["PUT", "POST", "DELETE", "GET"],
          AllowedOrigins: [process.env.APP_URL || "http://localhost:5173"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3000,
        },
      ],
    };

    // Update CORS configuration
    const putCorsCommand = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfig,
    });
    await client.send(putCorsCommand);
    console.log("Updated CORS configuration");
  } catch (error) {
    console.error("Error updating CORS configuration:", error);
    throw error;
  }
}

// Call this function when the module is loaded
ensureCorsConfiguration().catch(console.error);

async function listBuckets(
  ...options: ConstructorParameters<typeof ListBucketsCommand>
) {
  const listBucketsCommand = new ListBucketsCommand(...options);
  const buckets = await client.send(listBucketsCommand);

  return buckets;
}

async function listFolders(
  options?: Omit<
    ConstructorParameters<typeof ListObjectsV2Command>[0],
    "Bucket" | "Delimiter"
  >,
) {
  const listFoldersCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Delimiter: "/",
    ...options,
  });
  const folders = await client.send(listFoldersCommand);

  return folders;
}

async function getPictureUrl(
  options: Omit<
    ConstructorParameters<typeof GetObjectCommand>[0],
    "Bucket" | "Delimiter"
  >,
) {
  const getPictureCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    ...options,
  });
  const pictureUrl = getSignedUrl(client, getPictureCommand, {
    expiresIn: 3600,
  });

  return pictureUrl;
}

export const s3 = {
  listBuckets,
  listFolders,
  getPictureUrl,
  async generateUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    try {
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      return url;
    } catch (error) {
      console.error("Error generating upload URL:", error);
      throw error;
    }
  },

  async generateDownloadUrl(key: string): Promise<string> {
    // Ensure the key has the correct extension
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    try {
      console.log("Generating download URL for key:", key);
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      return url;
    } catch (error) {
      console.error("Error generating download URL:", error);
      throw error;
    }
  },

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    try {
      await client.send(command);
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  },

  async listFiles(options: { Prefix?: string } = {}): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: options.Prefix,
    });

    try {
      const response = await client.send(command);
      return (response.Contents || []).map((item) => item.Key || "");
    } catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  },

  async getFileUrl(userId: string, fileId: string, fileExtension: string): Promise<string> {
    // Get extension from content type if available, otherwise use provided extension
    const extension = fileExtension.split('/')[1] || fileExtension;
    const key = `${userId}/${fileId}.${extension}`;
    console.log("Generating URL for file:", { bucket: BUCKET_NAME, key, fileExtension });
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    try {
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      return url;
    } catch (error) {
      console.error("Error generating file URL:", error);
      throw error;
    }
  },
};
