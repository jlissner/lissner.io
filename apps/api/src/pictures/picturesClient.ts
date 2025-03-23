import { S3Client, SelectObjectContentCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: "us-west-2",
});

export const picturesClient = {
  async getPictures(filters: PictureFilters) {
    // select objec
    const listObjectsCommand = new SelectObjectContentCommand({
      Bucket: "documents.lissner.io",
      Key: 'db/pictures.json',
      Expression: `SELECT * FROM S3Object WHERE email = ${filters.email}`,
      ExpressionType: 'SQL',
      InputSerialization: {
        JSON: {
          Type: 'DOCUMENT',
        }
      },
      OutputSerialization: {
        JSON: {},
      },

    });
    const res = await s3Client.send(listObjectsCommand);

    return res;

  },
  getPicture(key: string) {
    return key;
  },
};
