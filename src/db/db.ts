import { GetObjectCommand, S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import jsonata from "jsonata";
import invariant from "tiny-invariant";

const BUCKET = "documents.lissner.io";
const KEY = "db/v1.json";

const s3Client = new S3Client({
  region: "us-west-2",
});

async function latest(): Promise<RootDb> {
  const getObjectCommand = new GetObjectCommand({
    Bucket: BUCKET,
    Key: KEY,
  });
  const { Body } = await s3Client.send(getObjectCommand);

  invariant(Body, "Failed to fetch db/v1.json");

  const res = await Body.transformToString();

  return JSON.parse(res);
}

async function select(query: string, params?: Record<string, unknown>) {
  const currentData = await latest();
  const expression = jsonata(query);
  const res = await expression.evaluate(currentData, params);

  return res;
}

async function update(db: RootDb) {
  const putObjectCommand = new PutObjectCommand({
    Bucket: BUCKET,
    Key: KEY,
    Body: JSON.stringify(db),
  });
  await s3Client.send(putObjectCommand);

  return db;
}

export const db = {
  latest,
  select,
  update,
};
