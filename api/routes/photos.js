const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { dynamodb, TABLE_NAMES } = require('../config/database');
const { uploadPhotoWithThumbnail, deletePhotoAllVersions } = require('../config/s3');
const { authenticateToken } = require('../middleware/auth');

module.exports = (upload) => {
  const router = express.Router();

  // All photo routes require authentication
  router.use(authenticateToken);

  // Get photos with pagination (using ChronologicalIndex)
  router.get('/', async (req, res) => {
    try {
      const { limit = 20, lastKey } = req.query;

      // Use ChronologicalIndex GSI for efficient chronological browsing
      const queryParams = {
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'ChronologicalIndex',
        KeyConditionExpression: 'photoType = :photoType',
        ExpressionAttributeValues: {
          ':photoType': 'photo'
        },
        ScanIndexForward: false, // Newest first (descending order)
        Limit: parseInt(limit),
      };

      if (lastKey) {
        queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
      }

      const result = await dynamodb.send(new QueryCommand(queryParams));
      const photos = result.Items || [];

      console.log(`Fetched ${photos.length} photos using ChronologicalIndex (newest first)`);

      res.json({
        photos,
        lastKey: result.LastEvaluatedKey 
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null,
      });
    } catch (error) {
      console.error('Get photos error:', error);
      res.status(500).json({ error: 'Failed to fetch photos' });
    }
  });

  // Get photos by user (using UserPhotosIndex)
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 20, lastKey } = req.query;

      // Use UserPhotosIndex GSI for efficient user photo queries
      const queryParams = {
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'UserPhotosIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false, // Newest first
        Limit: parseInt(limit),
      };

      if (lastKey) {
        queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
      }

      const result = await dynamodb.send(new QueryCommand(queryParams));
      const photos = result.Items || [];

      res.json({
        photos,
        lastKey: result.LastEvaluatedKey 
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null,
      });
    } catch (error) {
      console.error('Get user photos error:', error);
      res.status(500).json({ error: 'Failed to fetch user photos' });
    }
  });

  // Get photos in album (using AlbumPhotosIndex) 
  router.get('/album/:albumId', async (req, res) => {
    try {
      const { albumId } = req.params;
      const { limit = 20, lastKey } = req.query;

      // Use AlbumPhotosIndex GSI for efficient album photo queries
      const queryParams = {
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'AlbumPhotosIndex',
        KeyConditionExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
          ':albumId': albumId
        },
        ScanIndexForward: false, // Newest first in album
        Limit: parseInt(limit),
      };

      if (lastKey) {
        queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
      }

      const result = await dynamodb.send(new QueryCommand(queryParams));
      const photos = result.Items || [];

      res.json({
        photos,
        lastKey: result.LastEvaluatedKey 
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null,
      });
    } catch (error) {
      console.error('Get album photos error:', error);
      res.status(500).json({ error: 'Failed to fetch album photos' });
    }
  });

  // Get recent upload activity by user (optimized)
  router.get('/recent-activity', async (req, res) => {
    try {
      const { limit = 50 } = req.query;

      // Use ChronologicalIndex to get recent photos efficiently
      const queryParams = {
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'ChronologicalIndex',
        KeyConditionExpression: 'photoType = :photoType',
        ExpressionAttributeValues: {
          ':photoType': 'photo'
        },
        ScanIndexForward: false, // Newest first
        Limit: parseInt(limit),
      };

      const result = await dynamodb.send(new QueryCommand(queryParams));
      const photos = result.Items || [];

      // Group photos by user and get recent activity
      const userActivity = {};
      
      photos.forEach(photo => {
        const user = photo.uploadedBy;
        if (!userActivity[user]) {
          userActivity[user] = {
            email: user,
            photoCount: 0,
            latestUpload: photo.uploadedAt,
            recentPhotos: []
          };
        }
        
        userActivity[user].photoCount++;
        userActivity[user].recentPhotos.push({
          id: photo.id,
          url: photo.thumbnailUrl || photo.url,
          caption: photo.caption,
          uploadedAt: photo.uploadedAt,
          takenAt: photo.takenAt
        });
        
        // Keep only the most recent 3 photos per user
        if (userActivity[user].recentPhotos.length > 3) {
          userActivity[user].recentPhotos.pop();
        }
      });

      // Convert to array and sort by latest upload
      const activity = Object.values(userActivity).sort((a, b) => 
        new Date(b.latestUpload).getTime() - new Date(a.latestUpload).getTime()
      );

      res.json({ activity });
    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({ error: 'Failed to fetch recent activity' });
    }
  });

  // Upload photo
  router.post('/upload', upload.single('photo'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Photo file is required' });
      }

      const photoId = uuidv4();
      const fileName = `photos/${photoId}-${Date.now()}.jpg`;

      // Upload with thumbnail generation
      const uploadResult = await uploadPhotoWithThumbnail(req.file.buffer, fileName);

      // Parse tags from form data
      let tags = [];
      if (req.body.tags) {
        try {
          tags = JSON.parse(req.body.tags);
          if (!Array.isArray(tags)) {
            tags = [];
          }
        } catch (error) {
          console.error('Error parsing tags:', error);
          tags = [];
        }
      }

      // Get or generate upload session ID
      let uploadSessionId = req.body.uploadSessionId;
      if (!uploadSessionId) {
        // Generate a new session ID if not provided
        uploadSessionId = uuidv4();
        console.log(`Generated new upload session ID: ${uploadSessionId}`);
      }

      // Get album name from request
      const albumName = req.body.albumName;

      // Extract photo taken date and location from EXIF metadata if available
      let takenAt = null;
      let location = null;
      
      if (uploadResult.exif) {
        if (uploadResult.exif.DateTimeOriginal) {
          takenAt = uploadResult.exif.DateTimeOriginal;
        }
        if (uploadResult.exif.location) {
          location = uploadResult.exif.location;
        }
      }

      // Save photo metadata to DynamoDB
      const photo = {
        id: photoId,
        photoType: 'photo', // For ChronologicalIndex GSI
        userId: req.user.email, // For UserPhotosIndex GSI  
        albumId: uploadSessionId, // For AlbumPhotosIndex GSI
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        originalUrl: uploadResult.originalUrl,
        s3Key: uploadResult.s3Key,
        thumbnailS3Key: uploadResult.thumbnailS3Key,
        originalS3Key: uploadResult.originalS3Key,
        caption: req.body.caption || '',
        uploadedBy: req.user.email,
        uploadedAt: new Date().toISOString(),
        uploadSessionId: uploadSessionId, // Keep for backwards compatibility
        albumName: albumName,
        takenAt: takenAt,
        location: location,
        tags: tags,
        comments: [],
        reactions: [],
      };

      // Create album metadata record if this is the first photo in the album
      const albumMetadataId = `album_${uploadSessionId}`;
      
      // Check if album metadata already exists
      const existingAlbum = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: albumMetadataId }
      }));

      if (!existingAlbum.Item) {
        // Create album metadata record
        const albumMetadata = {
          id: albumMetadataId,
          photoType: 'album', // For ChronologicalIndex GSI to find albums
          albumId: uploadSessionId,
          albumName: albumName || `Album from ${new Date().toLocaleDateString()}`,
          uploadedBy: req.user.email,
          uploadedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };

        await dynamodb.send(new PutCommand({
          TableName: TABLE_NAMES.PHOTOS,
          Item: albumMetadata,
        }));
      }

      // Save the photo record
      await dynamodb.send(new PutCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Item: photo,
      }));

      res.json({ photo, message: 'Photo uploaded successfully' });
    } catch (error) {
      console.error('Upload photo error:', error);
      res.status(500).json({ error: 'Failed to upload photo' });
    }
  });

  // Add comment to photo
  router.post('/:photoId/comments', async (req, res) => {
    try {
      const { photoId } = req.params;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      const comment = {
        id: uuidv4(),
        content: content.trim(),
        author: req.user.email,
        createdAt: new Date().toISOString(),
      };

      // Add comment to photo's comments array
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
        UpdateExpression: 'SET comments = list_append(if_not_exists(comments, :empty_list), :new_comment)',
        ExpressionAttributeValues: {
          ':empty_list': [],
          ':new_comment': [comment],
        },
      }));

      res.json({ comment, message: 'Comment added successfully' });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // Add reaction to photo
  router.post('/:photoId/reactions', async (req, res) => {
    try {
      const { photoId } = req.params;
      const { type } = req.body;

      if (!type || typeof type !== 'string' || type.trim().length === 0) {
        return res.status(400).json({ error: 'Reaction type is required' });
      }

      // Simple validation for emoji (basic check for unicode characters)
      const emoji = type.trim();
      if (emoji.length > 10) { // Prevent very long strings
        return res.status(400).json({ error: 'Reaction must be a valid emoji' });
      }

      // Get current photo to check for existing reactions
      const photoResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
      }));

      if (!photoResult.Item) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      const photo = photoResult.Item;
      const reactions = photo.reactions || [];
      
      // Check if user already reacted with this specific emoji type
      const existingReactionIndex = reactions.findIndex(r => r.author === req.user.email && r.type === emoji);

      if (existingReactionIndex >= 0) {
        // User already has this reaction, so remove it (toggle off)
        reactions.splice(existingReactionIndex, 1);
      } else {
        // Add new reaction (user can have multiple different reactions)
        const newReaction = {
          id: uuidv4(),
          type: emoji,
          author: req.user.email,
          createdAt: new Date().toISOString(),
        };
        reactions.push(newReaction);
      }

      // Update photo with new reactions array
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
        UpdateExpression: 'SET reactions = :reactions',
        ExpressionAttributeValues: {
          ':reactions': reactions,
        },
      }));

      res.json({ message: 'Reaction updated successfully' });
    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  });

  // Remove specific reaction from photo by reaction ID
  router.delete('/:photoId/reactions/:reactionId', async (req, res) => {
    try {
      const { photoId, reactionId } = req.params;

      // Get current photo
      const photoResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
      }));

      if (!photoResult.Item) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      const photo = photoResult.Item;
      const reactions = photo.reactions || [];
      
      // Find and remove specific reaction by ID and verify ownership
      const reactionIndex = reactions.findIndex(r => r.id === reactionId && r.author === req.user.email);
      
      if (reactionIndex === -1) {
        return res.status(404).json({ error: 'Reaction not found or not owned by user' });
      }

      // Remove the specific reaction
      reactions.splice(reactionIndex, 1);

      // Update photo with filtered reactions
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
        UpdateExpression: 'SET reactions = :reactions',
        ExpressionAttributeValues: {
          ':reactions': reactions,
        },
      }));

      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error('Remove specific reaction error:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  });

  // Remove all reactions from photo (legacy endpoint)
  router.delete('/:photoId/reactions', async (req, res) => {
    try {
      const { photoId } = req.params;

      // Get current photo
      const photoResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
      }));

      if (!photoResult.Item) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      const photo = photoResult.Item;
      const reactions = photo.reactions || [];
      
      // Filter out user's reaction
      const newReactions = reactions.filter(r => r.author !== req.user.email);

      if (newReactions.length === reactions.length) {
        return res.status(404).json({ error: 'No reaction found to remove' });
      }

      // Update photo with filtered reactions
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
        UpdateExpression: 'SET reactions = :reactions',
        ExpressionAttributeValues: {
          ':reactions': newReactions,
        },
      }));

      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error('Remove reaction error:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  });

  // Add tag to photo
  router.post('/:photoId/tags', async (req, res) => {
    try {
      const { photoId } = req.params;
      const { tag } = req.body;

      if (!tag || !tag.trim()) {
        return res.status(400).json({ error: 'Tag is required' });
      }

      // Get current photo
      const photoResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
      }));

      if (!photoResult.Item) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      const currentTags = photoResult.Item.tags || [];
      const newTag = tag.trim().toLowerCase();

      if (currentTags.includes(newTag)) {
        return res.status(400).json({ error: 'Tag already exists' });
      }

      // Add tag to photo
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
        UpdateExpression: 'SET tags = list_append(if_not_exists(tags, :empty_list), :new_tag)',
        ExpressionAttributeValues: {
          ':empty_list': [],
          ':new_tag': [newTag],
        },
      }));

      res.json({ message: 'Tag added successfully' });
    } catch (error) {
      console.error('Add tag error:', error);
      res.status(500).json({ error: 'Failed to add tag' });
    }
  });

  // Remove tag from photo
  router.delete('/:photoId/tags/:tag', async (req, res) => {
    try {
      const { photoId, tag } = req.params;

      if (!tag || !tag.trim()) {
        return res.status(400).json({ error: 'Tag is required' });
      }

      // Get current photo
      const photoResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
      }));

      if (!photoResult.Item) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      const currentTags = photoResult.Item.tags || [];
      const tagToRemove = decodeURIComponent(tag).trim().toLowerCase();

      if (!currentTags.includes(tagToRemove)) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      // Remove tag from photo
      const newTags = currentTags.filter(t => t !== tagToRemove);

      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
        UpdateExpression: 'SET tags = :tags',
        ExpressionAttributeValues: {
          ':tags': newTags,
        },
      }));

      res.json({ message: 'Tag removed successfully' });
    } catch (error) {
      console.error('Remove tag error:', error);
      res.status(500).json({ error: 'Failed to remove tag' });
    }
  });

  // Delete photo
  router.delete('/:photoId', async (req, res) => {
    try {
      const { photoId } = req.params;

      // Get the photo to delete
      const photoResult = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
      }));

      if (!photoResult.Item) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      const photo = photoResult.Item;

      // Check if user is authorized (owner or admin)
      if (photo.uploadedBy !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete this photo' });
      }

      // Delete all versions from S3
      
      // Handle legacy photos that might not have all S3 keys
      const s3Key = photo.s3Key;
      const thumbnailS3Key = photo.thumbnailS3Key;
      const originalS3Key = photo.originalS3Key;
      
      // For very old photos, we might only have the main URL
      if (!s3Key && !thumbnailS3Key && !originalS3Key && photo.url) {
        // Try to extract key from URL for legacy photos
        const urlMatch = photo.url.match(/amazonaws\.com\/(.+)$/);
        if (urlMatch) {
          const legacyKey = urlMatch[1];
          await deletePhotoAllVersions(legacyKey, null, null);
        }
      } else {
        await deletePhotoAllVersions(s3Key, thumbnailS3Key, originalS3Key);
      }

      // Delete from DynamoDB
      await dynamodb.send(new DeleteCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: photoId },
      }));

      res.json({ message: 'Photo deleted successfully' });
    } catch (error) {
      console.error('Delete photo error:', error);
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  });

  // Get all albums (optimized with metadata approach)
  router.get('/albums', async (req, res) => {
    try {
      const { limit = 20, lastKey } = req.query;

      // Query for album metadata efficiently using ChronologicalIndex  
      const queryParams = {
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'ChronologicalIndex',
        KeyConditionExpression: 'photoType = :photoType',
        ExpressionAttributeValues: {
          ':photoType': 'album'
        },
        ScanIndexForward: false, // Newest first
        Limit: parseInt(limit),
      };

      if (lastKey) {
        queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
      }

      const result = await dynamodb.send(new QueryCommand(queryParams));
      const albumMetadata = result.Items || [];

      // Get photo counts and preview photos for each album
      const albumsWithDetails = await Promise.all(
        albumMetadata.map(async (album) => {
          // Get total count for this album
          const countQuery = {
            TableName: TABLE_NAMES.PHOTOS,
            IndexName: 'AlbumPhotosIndex',
            KeyConditionExpression: 'albumId = :albumId',
            ExpressionAttributeValues: {
              ':albumId': album.albumId
            },
            Select: 'COUNT'
          };

          // Get preview photos (limited to 6 for UI display)
          const previewQuery = {
            TableName: TABLE_NAMES.PHOTOS,
            IndexName: 'AlbumPhotosIndex',
            KeyConditionExpression: 'albumId = :albumId',
            ExpressionAttributeValues: {
              ':albumId': album.albumId
            },
            ScanIndexForward: false,
            Limit: 6, // Get first 6 photos for preview (to support showing all 6 or 5+more logic)
            Select: 'ALL_ATTRIBUTES'
          };

          // Get count (no limit - we want the actual total)
          const countResult = await dynamodb.send(new QueryCommand(countQuery));

          // Get preview photos  
          const photosResult = await dynamodb.send(new QueryCommand(previewQuery));

          return {
            id: album.albumId,
            name: album.albumName || `Album from ${new Date(album.uploadedAt).toLocaleDateString()}`,
            uploadedBy: album.uploadedBy,
            createdAt: album.uploadedAt,
            photoCount: countResult.Count || 0,
            comments: album.comments || [],
            reactions: album.reactions || [],
            photos: (photosResult.Items || []).map(photo => ({
              id: photo.id,
              url: photo.thumbnailUrl || photo.url,
              caption: photo.caption
            }))
          };
        })
      );

      res.json({ 
        albums: albumsWithDetails,
        lastKey: result.LastEvaluatedKey 
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null
      });
    } catch (error) {
      console.error('Get albums error:', error);
      res.status(500).json({ error: 'Failed to fetch albums' });
    }
  });

  // Update album name (optimized)
  router.put('/albums/:albumId', async (req, res) => {
    try {
      const { albumId } = req.params;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Album name is required' });
      }

      // Get first photo in album to check ownership
      const checkQuery = {
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'AlbumPhotosIndex',
        KeyConditionExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
          ':albumId': albumId
        },
        Limit: 1
      };

      const checkResult = await dynamodb.send(new QueryCommand(checkQuery));
      const albumPhotos = checkResult.Items || [];

      if (albumPhotos.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      // Check if user owns this album
      if (albumPhotos[0].uploadedBy !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Not authorized to modify this album' });
      }

      // Update album metadata record
      const updateAlbumMetadata = {
        TableName: TABLE_NAMES.PHOTOS,
        Key: { 
          id: `album_${albumId}`,
          uploadedAt: albumPhotos[0].uploadedAt 
        },
        UpdateExpression: 'SET albumName = :name',
        ExpressionAttributeValues: {
          ':name': name.trim()
        }
      };

      await dynamodb.send(new UpdateCommand(updateAlbumMetadata));

      // Get all photos in album and update them
      const getAllPhotosQuery = {
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'AlbumPhotosIndex',
        KeyConditionExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
          ':albumId': albumId
        }
      };

      const allPhotosResult = await dynamodb.send(new QueryCommand(getAllPhotosQuery));
      const allAlbumPhotos = allPhotosResult.Items || [];

      // Update all photos in the album with the new name
      const updatePromises = allAlbumPhotos.map(photo => 
        dynamodb.send(new UpdateCommand({
          TableName: TABLE_NAMES.PHOTOS,
          Key: { id: photo.id },
          UpdateExpression: 'SET albumName = :name',
          ExpressionAttributeValues: {
            ':name': name.trim()
          }
        }))
      );

      await Promise.all(updatePromises);

      res.json({ 
        message: 'Album name updated successfully',
        albumId,
        name: name.trim(),
        updatedPhotos: allAlbumPhotos.length
      });
    } catch (error) {
      console.error('Update album name error:', error);
      res.status(500).json({ error: 'Failed to update album name' });
    }
  });

  // Add comment to album
  router.post('/albums/:albumId/comments', async (req, res) => {
    try {
      const { albumId } = req.params;
      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: 'Comment content is required' });
      }

      // Find album by albumId field (upload session ID)
      const albumQuery = await dynamodb.send(new QueryCommand({
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'ChronologicalIndex',
        KeyConditionExpression: 'photoType = :photoType',
        FilterExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
          ':photoType': 'album',
          ':albumId': albumId
        },
        Limit: 1
      }));

      if (!albumQuery.Items || albumQuery.Items.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const album = albumQuery.Items[0];
      const comments = album.comments || [];
      
      // Add new comment
      const newComment = {
        id: uuidv4(),
        content: content.trim(),
        author: req.user.email,
        createdAt: new Date().toISOString(),
      };
      comments.push(newComment);

      // Update album with new comments array using the album's actual ID
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: album.id },
        UpdateExpression: 'SET comments = :comments',
        ExpressionAttributeValues: {
          ':comments': comments,
        },
      }));

      res.json({ message: 'Comment added successfully', comment: newComment });
    } catch (error) {
      console.error('Add album comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // Delete comment from album
  router.delete('/albums/:albumId/comments/:commentId', async (req, res) => {
    try {
      const { albumId, commentId } = req.params;

      // Find album by albumId field (upload session ID)
      const albumQuery = await dynamodb.send(new QueryCommand({
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'ChronologicalIndex',
        KeyConditionExpression: 'photoType = :photoType',
        FilterExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
          ':photoType': 'album',
          ':albumId': albumId
        },
        Limit: 1
      }));

      if (!albumQuery.Items || albumQuery.Items.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const album = albumQuery.Items[0];
      const comments = album.comments || [];
      
      // Find the comment to delete
      const commentIndex = comments.findIndex(c => c.id === commentId);
      if (commentIndex === -1) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      const comment = comments[commentIndex];
      
      // Check if user is authorized to delete this comment
      if (comment.author !== req.user.email && !req.user.isAdmin) {
        return res.status(403).json({ error: 'You can only delete your own comments' });
      }

      // Remove the comment
      comments.splice(commentIndex, 1);

      // Update album with updated comments array
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: album.id },
        UpdateExpression: 'SET comments = :comments',
        ExpressionAttributeValues: {
          ':comments': comments,
        },
      }));

      res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Delete album comment error:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  // Add reaction to album
  router.post('/albums/:albumId/reactions', async (req, res) => {
    try {
      const { albumId } = req.params;
      const { type } = req.body;

      if (!type || typeof type !== 'string' || type.trim().length === 0) {
        return res.status(400).json({ error: 'Reaction type is required' });
      }

      // Simple validation for emoji (basic check for unicode characters)
      const emoji = type.trim();
      if (emoji.length > 10) { // Prevent very long strings
        return res.status(400).json({ error: 'Reaction must be a valid emoji' });
      }

      // Find album by albumId field (upload session ID)
      const albumQuery = await dynamodb.send(new QueryCommand({
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'ChronologicalIndex',
        KeyConditionExpression: 'photoType = :photoType',
        FilterExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
          ':photoType': 'album',
          ':albumId': albumId
        },
        Limit: 1
      }));

      if (!albumQuery.Items || albumQuery.Items.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const album = albumQuery.Items[0];
      const reactions = album.reactions || [];
      
      // Check if user already reacted with this specific emoji type
      const existingReactionIndex = reactions.findIndex(r => r.author === req.user.email && r.type === emoji);

      if (existingReactionIndex >= 0) {
        // User already has this reaction, so remove it (toggle off)
        reactions.splice(existingReactionIndex, 1);
      } else {
        // Add new reaction (user can have multiple different reactions)
        const newReaction = {
          id: uuidv4(),
          type: emoji,
          author: req.user.email,
          createdAt: new Date().toISOString(),
        };
        reactions.push(newReaction);
      }

      // Update album with new reactions array using the album's actual ID
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: album.id },
        UpdateExpression: 'SET reactions = :reactions',
        ExpressionAttributeValues: {
          ':reactions': reactions,
        },
      }));

      res.json({ message: 'Reaction updated successfully' });
    } catch (error) {
      console.error('Add album reaction error:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  });

  // Remove specific reaction from album by reaction ID
  router.delete('/albums/:albumId/reactions/:reactionId', async (req, res) => {
    try {
      const { albumId, reactionId } = req.params;

      // Find album by albumId field (upload session ID)
      const albumQuery = await dynamodb.send(new QueryCommand({
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'ChronologicalIndex',
        KeyConditionExpression: 'photoType = :photoType',
        FilterExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
          ':photoType': 'album',
          ':albumId': albumId
        },
        Limit: 1
      }));

      if (!albumQuery.Items || albumQuery.Items.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const album = albumQuery.Items[0];
      const reactions = album.reactions || [];
      
      // Find and remove specific reaction by ID and verify ownership
      const reactionIndex = reactions.findIndex(r => r.id === reactionId && r.author === req.user.email);
      
      if (reactionIndex === -1) {
        return res.status(404).json({ error: 'Reaction not found or not owned by user' });
      }

      // Remove the specific reaction
      reactions.splice(reactionIndex, 1);

      // Update album with filtered reactions array using the album's actual ID
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: album.id },
        UpdateExpression: 'SET reactions = :reactions',
        ExpressionAttributeValues: {
          ':reactions': reactions,
        },
      }));

      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error('Remove specific album reaction error:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  });

  // Remove all reactions from album (legacy endpoint)
  router.delete('/albums/:albumId/reactions', async (req, res) => {
    try {
      const { albumId } = req.params;

      // Find album by albumId field (upload session ID)
      const albumQuery = await dynamodb.send(new QueryCommand({
        TableName: TABLE_NAMES.PHOTOS,
        IndexName: 'ChronologicalIndex',
        KeyConditionExpression: 'photoType = :photoType',
        FilterExpression: 'albumId = :albumId',
        ExpressionAttributeValues: {
          ':photoType': 'album',
          ':albumId': albumId
        },
        Limit: 1
      }));

      if (!albumQuery.Items || albumQuery.Items.length === 0) {
        return res.status(404).json({ error: 'Album not found' });
      }

      const album = albumQuery.Items[0];
      const reactions = album.reactions || [];
      
      // Remove user's reaction
      const filteredReactions = reactions.filter(r => r.author !== req.user.email);

      // Update album with filtered reactions array using the album's actual ID
      await dynamodb.send(new UpdateCommand({
        TableName: TABLE_NAMES.PHOTOS,
        Key: { id: album.id },
        UpdateExpression: 'SET reactions = :reactions',
        ExpressionAttributeValues: {
          ':reactions': filteredReactions,
        },
      }));

      res.json({ message: 'Reaction removed successfully' });
    } catch (error) {
      console.error('Remove album reaction error:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  });

  return router;
}; 