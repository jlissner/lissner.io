import { S3Client } from "@aws-sdk/client-s3";

export const client = new S3Client({
  region: 'us-west-2',
});
