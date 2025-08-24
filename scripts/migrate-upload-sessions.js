#!/usr/bin/env node

/**
 * Migration script to add uploadSessionId to existing photos
 * This groups photos by user and upload time to create logical upload sessions
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

// Configuration
const STAGE = process.argv[2] || 'dev';
const REGION = process.argv[3] || detectRegion();
const TABLE_NAME = `lissner-photos-${STAGE}`;
const BATCH_SIZE = 25; // DynamoDB batch size limit
const TIME_WINDOW_MS = 60000; // 1 minute window for grouping

// Detect region from environment or default
function detectRegion() {
  if (process.env.AWS_DEFAULT_REGION) {
    return process.env.AWS_DEFAULT_REGION;
  }
  
  console.log('❌ No region specified and AWS_DEFAULT_REGION not set.');
  console.log('Usage:');
  console.log(`   node scripts/migrate-upload-sessions.js ${STAGE} your-region`);
  console.log('');
  console.log('Example:');
  console.log(`   node scripts/migrate-upload-sessions.js ${STAGE} us-west-2`);
  console.log('');
  return 'us-west-2';
}

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({ region: REGION });
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);

// Color output functions
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Group photos by upload sessions
function groupPhotosByUploadSession(photos) {
  const groups = [];
  const processed = new Set();
  
  // Sort photos by upload time
  const sortedPhotos = photos.sort((a, b) => 
    new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
  );
  
  sortedPhotos.forEach(photo => {
    if (processed.has(photo.id)) return;
    
    const uploadTime = new Date(photo.uploadedAt).getTime();
    const relatedPhotos = sortedPhotos.filter(p => 
      p.uploadedBy === photo.uploadedBy &&
      Math.abs(new Date(p.uploadedAt).getTime() - uploadTime) <= TIME_WINDOW_MS
    );
    
    // Mark all related photos as processed
    relatedPhotos.forEach(p => processed.add(p.id));
    
    // Generate a unique session ID for this group
    const sessionId = `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    groups.push({
      sessionId,
      photos: relatedPhotos,
      uploadedBy: photo.uploadedBy,
      uploadedAt: photo.uploadedAt,
      count: relatedPhotos.length
    });
  });
  
  return groups;
}

// Update photos with upload session ID
async function updatePhotosWithSessionId(sessionGroups) {
  let totalUpdated = 0;
  let totalErrors = 0;
  
  colorLog(`📝 Updating ${sessionGroups.length} upload sessions...`, 'blue');
  
  for (const group of sessionGroups) {
    try {
      // Update all photos in this session
      const updatePromises = group.photos.map(photo => 
        dynamodb.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: photo.id },
          UpdateExpression: 'SET uploadSessionId = :sessionId',
          ExpressionAttributeValues: {
            ':sessionId': group.sessionId
          },
          ReturnValues: 'NONE'
        }))
      );
      
      await Promise.all(updatePromises);
      
      totalUpdated += group.photos.length;
      colorLog(`   ✅ Updated session ${group.sessionId}: ${group.photos.length} photos by ${group.uploadedBy}`, 'green');
      
    } catch (error) {
      totalErrors++;
      colorLog(`   ❌ Error updating session ${group.sessionId}: ${error.message}`, 'red');
    }
  }
  
  return { totalUpdated, totalErrors };
}

// Main migration function
async function migrateUploadSessions() {
  colorLog('🔄 Starting upload session migration...', 'cyan');
  colorLog(`📋 Configuration:`, 'blue');
  colorLog(`   Stage: ${STAGE}`, 'blue');
  colorLog(`   Region: ${REGION}`, 'blue');
  colorLog(`   Table: ${TABLE_NAME}`, 'blue');
  colorLog(`   Time Window: ${TIME_WINDOW_MS / 1000} seconds`, 'blue');
  console.log('');
  
  try {
    // Scan all photos without uploadSessionId
    colorLog('🔍 Scanning for photos without uploadSessionId...', 'yellow');
    
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: 'attribute_not_exists(uploadSessionId)'
    };
    
    const photos = [];
    let lastEvaluatedKey = null;
    
    do {
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const result = await dynamodb.send(new ScanCommand(scanParams));
      photos.push(...(result.Items || []));
      lastEvaluatedKey = result.LastEvaluatedKey;
      
      colorLog(`   Found ${photos.length} photos so far...`, 'yellow');
      
    } while (lastEvaluatedKey);
    
    if (photos.length === 0) {
      colorLog('✅ No photos found without uploadSessionId. Migration not needed.', 'green');
      return;
    }
    
    colorLog(`📊 Found ${photos.length} photos without uploadSessionId`, 'blue');
    
    // Group photos by upload sessions
    colorLog('🔗 Grouping photos by upload sessions...', 'yellow');
    const sessionGroups = groupPhotosByUploadSession(photos);
    
    colorLog(`📈 Created ${sessionGroups.length} upload sessions:`, 'blue');
    
    // Show session summary
    const sessionSummary = sessionGroups.reduce((acc, group) => {
      acc[group.uploadedBy] = (acc[group.uploadedBy] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(sessionSummary).forEach(([user, count]) => {
      colorLog(`   ${user}: ${count} sessions`, 'blue');
    });
    
    // Show detailed groups
    colorLog(`\n📝 Session details:`, 'blue');
    sessionGroups.forEach(group => {
      const groupType = group.count > 1 ? 'GROUP' : 'SINGLE';
      colorLog(`   ${groupType}: ${group.count} photos by ${group.uploadedBy} at ${group.uploadedAt}`, 'blue');
    });
    
    // Confirmation prompt
    console.log('');
    colorLog('⚠️  This will update all photos with uploadSessionId.', 'yellow');
    colorLog('⚠️  This operation cannot be easily undone.', 'yellow');
    console.log('');
    
    // 5-second countdown
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`\r⏰ Starting in ${i} seconds... (Press Ctrl+C to cancel)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\n');
    
    // Perform the migration
    const { totalUpdated, totalErrors } = await updatePhotosWithSessionId(sessionGroups);
    
    // Summary
    console.log('');
    colorLog('📊 Migration Summary:', 'cyan');
    colorLog(`   ✅ Photos updated: ${totalUpdated}`, 'green');
    colorLog(`   ❌ Errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
    colorLog(`   📦 Sessions created: ${sessionGroups.length}`, 'blue');
    console.log('');
    
    if (totalErrors === 0) {
      colorLog('🎉 Migration completed successfully!', 'green');
      colorLog('🔄 Photos will now be properly grouped by upload session.', 'green');
    } else {
      colorLog('⚠️  Migration completed with errors. Please review the output above.', 'yellow');
    }
    
  } catch (error) {
    colorLog(`❌ Migration failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  if (process.argv.length < 3) {
    console.log('Usage: node scripts/migrate-upload-sessions.js <stage> [region]');
    console.log('Example: node scripts/migrate-upload-sessions.js dev us-west-2');
    process.exit(1);
  }
  
  migrateUploadSessions()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateUploadSessions }; 