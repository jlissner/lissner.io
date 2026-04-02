import { S3Client } from "@aws-sdk/client-s3";

const S3_VARS = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET"] as const;

export function getS3Config(): {
  configured: boolean;
  missingVars: string[];
} {
  const missingVars = S3_VARS.filter((v) => !process.env[v]?.trim());
  return {
    configured: missingVars.length === 0,
    missingVars,
  };
}

export function createS3Client(): S3Client | null {
  const { configured } = getS3Config();
  if (!configured) return null;

  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}
