#!/usr/bin/env node

/**
 * Migration Script: Add photoType field to existing photos
 * 
 * This script adds the 'photoType' field to all existing photos in DynamoDB
 * to enable the new GSI-based sorting functionality.
 * 
 * Usage:
 *   cd api
 *   node ../scripts/migrate-photos.js [stage] [region]
 * 
 * Examples:
 *   node ../scripts/migrate-photos.js dev
 *   node ../scripts/migrate-photos.js dev us-west-2
 *   node ../scripts/migrate-photos.js prod eu-west-1
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { execSync } = require('child_process');

// Configuration
const STAGE = process.argv[2] || process.env.STAGE || 'dev';
const REGION = getAWSRegion();
const TABLE_NAME = `lissner-photos-${STAGE}`;

function getAWSRegion() {
  // Priority order for region detection:
  // 1. Command line argument
  // 2. Environment variables
  // 3. AWS CLI default region
  // 4. Fallback to us-east-1
  
  // 1. Check command line argument
  if (process.argv[3]) {
    return process.argv[3];
  }
  
  // 2. Check environment variables
  const envRegion = process.env.AWS_REGION || 
                   process.env.AWS_DEFAULT_REGION || 
                   process.env.CDK_DEFAULT_REGION;
  if (envRegion) {
    return envRegion;
  }
  
  // 3. Try to get from AWS CLI configuration
  try {
    const awsRegion = execSync('aws configure get region', { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'ignore'] 
    }).trim();
    if (awsRegion) {
      return awsRegion;
    }
  } catch (error) {
    // AWS CLI not configured or not available
  }
  
  // 4. Fallback
  console.log('⚠️  Could not detect AWS region. Using default: us-east-1');
  console.log('   If your resources are in a different region, specify it:');
  console.log(`   node ../scripts/migrate-photos.js ${STAGE} your-region`);
  console.log('');
  return 'us-west-2';
}

console.log('🚀 Photo Migration Script');
console.log('========================');
console.log(`Stage: ${STAGE}`);
console.log(`Region: ${REGION}`);
console.log(`Table: ${TABLE_NAME}`);
console.log('');

// Initialize DynamoDB client
const ddbClient = new DynamoDBClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(ddbClient);

async function migratePhotos() {
  try {
    console.log('🔍 Scanning for photos without photoType field...');
    
    // Scan all photos
    let scannedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let lastEvaluatedKey = undefined;
    
    do {
      const scanParams = {
        TableName: TABLE_NAME,
        FilterExpression: 'attribute_not_exists(photoType)',
        Limit: 25, // Process in small batches
      };
      
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await dynamodb.send(new ScanCommand(scanParams));
      const photos = result.Items || [];
      scannedCount += photos.length;
      
      if (photos.length === 0) {
        console.log('✅ No photos found without photoType field');
        break;
      }
      
      console.log(`📦 Processing batch of ${photos.length} photos...`);
      
      // Update each photo in parallel (with concurrency limit)
      const updatePromises = photos.map(async (photo, index) => {
        try {
          await dynamodb.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { id: photo.id },
            UpdateExpression: 'SET photoType = :photoType',
            ExpressionAttributeValues: {
              ':photoType': 'PHOTO'
            },
            ConditionExpression: 'attribute_exists(id)' // Ensure photo still exists
          }));
          
          updatedCount++;
          console.log(`  ✅ Updated photo ${photo.id} (${photo.uploadedBy} - ${photo.uploadedAt})`);
        } catch (error) {
          errorCount++;
          console.error(`  ❌ Failed to update photo ${photo.id}:`, error.message);
        }
      });
      
      await Promise.all(updatePromises);
      
      lastEvaluatedKey = result.LastEvaluatedKey;
      
      // Small delay to avoid overwhelming DynamoDB
      if (lastEvaluatedKey) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } while (lastEvaluatedKey);
    
    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`   Scanned: ${scannedCount} photos`);
    console.log(`   Updated: ${updatedCount} photos`);
    console.log(`   Errors:  ${errorCount} photos`);
    
    if (errorCount === 0) {
      console.log('');
      console.log('🎉 Migration completed successfully!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Deploy the updated API with GSI changes');
      console.log('   2. Test photo sorting functionality');
      console.log('   3. Monitor GSI for successful indexing');
    } else {
      console.log('');
      console.log('⚠️  Migration completed with errors.');
      console.log('   Please review the error messages above and retry if needed.');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function verifyTable() {
  try {
    // Quick verification that table exists
    const result = await dynamodb.send(new ScanCommand({
      TableName: TABLE_NAME,
      Limit: 1
    }));
    
    console.log(`✅ Successfully connected to table: ${TABLE_NAME}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to connect to table ${TABLE_NAME}:`, error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Make sure AWS credentials are configured');
    console.log('   2. Verify the stage name is correct');
    console.log('   3. Check that the DynamoDB table exists');
    console.log('   4. Ensure you have DynamoDB permissions');
    console.log(`   5. Verify the region is correct: ${REGION}`);
    console.log('      You can specify a different region:');
    console.log(`      node ../scripts/migrate-photos.js ${STAGE} your-region`);
    return false;
  }
}

// Main execution
async function main() {
  // Verify table access
  const isTableAccessible = await verifyTable();
  if (!isTableAccessible) {
    process.exit(1);
  }
  
  console.log('');
  
  // Confirm before proceeding
  if (process.env.NODE_ENV !== 'development') {
    console.log('⚠️  This will modify your DynamoDB table.');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');
  }
  
  await migratePhotos();
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Migration cancelled by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error);
  process.exit(1);
});

// Run the migration
main().catch(error => {
  console.error('💥 Migration script failed:', error);
  process.exit(1);
}); 