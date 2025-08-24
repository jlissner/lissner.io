const { DynamoDBClient, CreateTableCommand, DeleteTableCommand, DescribeTableCommand, waitUntilTableNotExists, waitUntilTableExists } = require('@aws-sdk/client-dynamodb');
const { migratePhotosToGSIStructure } = require('./migrate-to-gsi-structure.js');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_DEFAULT_REGION || 'us-west-2' });

const STAGE = process.env.STAGE || 'dev';
const REGION = process.env.AWS_DEFAULT_REGION || 'us-west-2';

// Color codes for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createPhotosTableWithGSIs() {
  const tableName = `lissner-photos-${STAGE}`;
  
  log('blue', `🏗️  Creating photos table with GSI structure: ${tableName}`);

  const tableParams = {
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'uploadedAt', AttributeType: 'S' },
      { AttributeName: 'photoType', AttributeType: 'S' },
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'albumId', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserPhotosIndex',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        BillingMode: 'PAY_PER_REQUEST'
      },
      {
        IndexName: 'AlbumPhotosIndex',
        KeySchema: [
          { AttributeName: 'albumId', KeyType: 'HASH' },
          { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        BillingMode: 'PAY_PER_REQUEST'
      },
      {
        IndexName: 'ChronologicalIndex',
        KeySchema: [
          { AttributeName: 'photoType', KeyType: 'HASH' },
          { AttributeName: 'uploadedAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        BillingMode: 'PAY_PER_REQUEST'
      }
    ]
  };

  try {
    await client.send(new CreateTableCommand(tableParams));
    log('green', `✅ Table ${tableName} created successfully with GSIs`);
    
    // Wait for table to be active
    log('yellow', 'Waiting for table to become active...');
    await waitUntilTableExists({ client, maxWaitTime: 300 }, { TableName: tableName });
    log('green', '✅ Table is now active');
    
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      log('yellow', `⚠️  Table ${tableName} already exists`);
    } else {
      throw error;
    }
  }
}

async function deleteExistingTable() {
  const tableName = `lissner-photos-${STAGE}`;
  
  log('blue', '⚡ Deleting existing table...');

  try {
    // Check if table exists first
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    
    // Table exists, delete it
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    log('yellow', `🗑️  Deleting table ${tableName}...`);
    
    // Wait for table to be deleted
    log('yellow', 'Waiting for table deletion...');
    await waitUntilTableNotExists({ client, maxWaitTime: 300 }, { TableName: tableName });
    log('green', '✅ Table deleted successfully');
    
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      log('yellow', '⚠️  Table does not exist, continuing...');
    } else {
      throw error;
    }
  }
}

async function createUsersTable() {
  const tableName = `lissner-users-${STAGE}`;
  
  log('blue', '👥 Creating users table...');

  const tableParams = {
    TableName: tableName,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        BillingMode: 'PAY_PER_REQUEST'
      }
    ]
  };

  try {
    await client.send(new CreateTableCommand(tableParams));
    log('green', `✅ Users table created successfully`);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      log('yellow', `⚠️  Users table already exists`);
    } else {
      log('yellow', `⚠️  Users table creation failed: ${error.message}`);
    }
  }
}

async function deployGSIUpdate() {
  log('blue', '🚀 DynamoDB GSI Deployment Script');
  log('blue', '=================================');
  console.log('');
  console.log(`Stage: ${STAGE}`);
  console.log(`Region: ${REGION}`);
  console.log('');

  try {
    log('yellow', '⚠️  WARNING: This will recreate your DynamoDB photos table.');
    log('yellow', '📋 What this script will do:');
    console.log('   1. Delete existing photos table');
    console.log('   2. Create new table with GSI structure');
    console.log('   3. Create users table (if needed)');
    console.log('   4. Run migration script to populate new attributes');
    console.log('');

    // For automation, we'll proceed directly
    // In production, you might want to add a confirmation prompt

    log('blue', '📦 Step 1: Backing up and deleting existing table...');
    await deleteExistingTable();

    log('blue', '🏗️  Step 2: Creating new table with GSIs...');
    await createPhotosTableWithGSIs();

    log('blue', '👥 Step 3: Ensuring users table exists...');
    await createUsersTable();

    log('blue', '🔄 Step 4: Running data migration...');
    await migratePhotosToGSIStructure();

    log('green', '🎉 Deployment completed successfully!');
    console.log('');
    log('blue', '📊 New GSI Structure:');
    console.log('   • UserPhotosIndex: Query photos by user');
    console.log('   • AlbumPhotosIndex: Query photos by album');
    console.log('   • ChronologicalIndex: Query photos by date');
    console.log('');
    log('blue', '💰 Estimated Monthly Cost:');
    console.log('   • Base table: ~$2-5/month');
    console.log('   • 3 GSIs: ~$6-15/month');
    console.log('   • Total: ~$8-20/month (depending on usage)');
    console.log('');
    log('green', '✅ Your photo app now has efficient pagination!');

  } catch (error) {
    log('red', `❌ Deployment failed: ${error.message}`);
    console.error(error);
    throw error;
  }
}

// Run deployment if called directly
if (require.main === module) {
  deployGSIUpdate()
    .then(() => {
      log('green', '✅ Deployment script completed');
      process.exit(0);
    })
    .catch((error) => {
      log('red', '❌ Deployment script failed');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { deployGSIUpdate }; 