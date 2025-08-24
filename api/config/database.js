const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

// Create DynamoDB client
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_DEFAULT_REGION,
});

// Create DynamoDB Document client
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAMES = {
  USERS: `lissner-users-${process.env.STAGE}`,
  PHOTOS: `lissner-photos-${process.env.STAGE}`,
  MAGIC_LINKS: `lissner-magic-links-${process.env.STAGE}`,
};

module.exports = {
  dynamodb,
  TABLE_NAMES,
}; 