const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({ region: process.env.AWS_DEFAULT_REGION || 'us-west-2' });
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = `lissner-photos-${process.env.STAGE || 'dev'}`;

async function migratePhotosToGSIStructure() {
  console.log('🔄 Starting migration to GSI structure...');
  console.log(`📋 Target table: ${TABLE_NAME}`);

  let totalUpdated = 0;
  let albumsCreated = 0;
  const albumsProcessed = new Set();

  try {
    // Scan all photos in batches
    let lastEvaluatedKey = null;
    
    do {
      const scanParams = {
        TableName: TABLE_NAME,
        Limit: 100, // Process in batches
      };

      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      console.log(`📖 Scanning batch starting from: ${lastEvaluatedKey ? JSON.stringify(lastEvaluatedKey) : 'beginning'}`);
      
      const result = await dynamodb.send(new ScanCommand(scanParams));
      const photos = result.Items || [];

      console.log(`🔍 Found ${photos.length} items in this batch`);

      // Process each photo
      for (const photo of photos) {
        // Skip if this is already an album metadata record
        if (photo.id && photo.id.startsWith('album_')) {
          console.log(`⏭️  Skipping album metadata record: ${photo.id}`);
          continue;
        }

        // Skip if this photo already has the new structure
        if (photo.userId && photo.albumId && photo.photoType === 'photo') {
          console.log(`✅ Photo ${photo.id} already migrated`);
          continue;
        }

        console.log(`🔧 Migrating photo: ${photo.id}`);

        // Prepare update attributes
        const updateExpression = [];
        const attributeValues = {};

        // Add userId if missing
        if (!photo.userId) {
          updateExpression.push('userId = :userId');
          attributeValues[':userId'] = photo.uploadedBy;
        }

        // Add albumId if missing (use uploadSessionId)
        if (!photo.albumId && photo.uploadSessionId) {
          updateExpression.push('albumId = :albumId');
          attributeValues[':albumId'] = photo.uploadSessionId;
        }

        // Update photoType if needed
        if (photo.photoType !== 'photo') {
          updateExpression.push('photoType = :photoType');
          attributeValues[':photoType'] = 'photo';
        }

        // Update the photo if needed
        if (updateExpression.length > 0) {
          const updateParams = {
            TableName: TABLE_NAME,
            Key: { id: photo.id },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeValues: attributeValues
          };

          await dynamodb.send(new UpdateCommand(updateParams));
          totalUpdated++;
          console.log(`✅ Updated photo: ${photo.id}`);
        }

        // Create album metadata record if needed
        if (photo.uploadSessionId && !albumsProcessed.has(photo.uploadSessionId)) {
          const albumMetadataId = `album_${photo.uploadSessionId}`;
          
          // Check if album metadata already exists
          const existingAlbum = await dynamodb.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: { id: albumMetadataId }
          }));

          if (!existingAlbum.Item) {
            // Create album metadata record
            const albumMetadata = {
              id: albumMetadataId,
              photoType: 'album',
              albumId: photo.uploadSessionId,
              albumName: photo.albumName || `Album from ${new Date(photo.uploadedAt).toLocaleDateString()}`,
              uploadedBy: photo.uploadedBy,
              uploadedAt: photo.uploadedAt,
              createdAt: photo.uploadedAt
            };

            await dynamodb.send(new PutCommand({
              TableName: TABLE_NAME,
              Item: albumMetadata
            }));

            albumsCreated++;
            console.log(`📁 Created album metadata: ${albumMetadataId} (${albumMetadata.albumName})`);
          }

          albumsProcessed.add(photo.uploadSessionId);
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
      
    } while (lastEvaluatedKey);

    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Migration summary:`);
    console.log(`   • Photos updated: ${totalUpdated}`);
    console.log(`   • Albums created: ${albumsCreated}`);
    console.log(`   • Unique albums processed: ${albumsProcessed.size}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  migratePhotosToGSIStructure()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePhotosToGSIStructure }; 