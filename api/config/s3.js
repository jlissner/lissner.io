const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');
const ExifParser = require('exif-parser');

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * Extracts EXIF data from an image buffer
 * @param {Buffer} buffer - The image buffer
 * @returns {Object} - Object containing DateTimeOriginal and location data
 */
const extractExifData = (buffer) => {
  try {
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    
    const exifData = {};
    
    // Extract photo taken date
    if (result.tags && result.tags.DateTimeOriginal) {
      exifData.DateTimeOriginal = new Date(result.tags.DateTimeOriginal * 1000).toISOString();
    }
    
    // Extract GPS location
    if (result.tags && result.tags.GPSLatitude && result.tags.GPSLongitude) {
      exifData.location = {
        latitude: result.tags.GPSLatitude,
        longitude: result.tags.GPSLongitude,
        altitude: result.tags.GPSAltitude || null
      };
    }
    
    return exifData;
  } catch (error) {
    // EXIF extraction failed, return empty object
    return {};
  }
};

const uploadToS3 = async (file, key) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: 'image/jpeg',
    // Note: Using bucket policy for public access instead of ACLs
  });

  try {
    const result = await s3.send(command);
    // Construct the URL manually since v3 doesn't return Location
    const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
    return url;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

const uploadPhotoWithThumbnail = async (fileBuffer, baseKey) => {
  try {
    // Extract EXIF data to get photo taken date and location
    const exifData = extractExifData(fileBuffer);
    
    // Generate thumbnail (400px wide, maintain aspect ratio)
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(400, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Optimize full-size image (max 1920px wide)
    const optimizedBuffer = await sharp(fileBuffer)
      .resize(1920, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Upload all three versions
    const thumbnailKey = baseKey.replace('.jpg', '-thumb.jpg');
    const originalKey = baseKey.replace('.jpg', '-original.jpg');
    
    const [fullUrl, thumbnailUrl, originalUrl] = await Promise.all([
      uploadToS3(optimizedBuffer, baseKey),
      uploadToS3(thumbnailBuffer, thumbnailKey),
      uploadToS3(fileBuffer, originalKey)
    ]);

    return {
      url: fullUrl,
      thumbnailUrl: thumbnailUrl,
      originalUrl: originalUrl,
      s3Key: baseKey,
      thumbnailS3Key: thumbnailKey,
      originalS3Key: originalKey,
      exif: exifData
    };

  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process and upload image');
  }
};

const deleteFromS3 = async (key) => {
  if (!key) {
    return;
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    await s3.send(command);
  } catch (error) {
    console.error(`S3 delete error for key ${key}:`, error);
    throw new Error(`Failed to delete file from S3: ${key}`);
  }
};

const deletePhotoAllVersions = async (s3Key, thumbnailS3Key, originalS3Key) => {
  try {
    const deletePromises = [];
    
    if (s3Key) deletePromises.push(deleteFromS3(s3Key));
    if (thumbnailS3Key) deletePromises.push(deleteFromS3(thumbnailS3Key));
    if (originalS3Key) deletePromises.push(deleteFromS3(originalS3Key));

    if (deletePromises.length === 0) {
      return;
    }

    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Delete photo all versions error:', error);
    throw new Error('Failed to delete photo and all versions');
  }
};

module.exports = {
  s3,
  uploadToS3,
  uploadPhotoWithThumbnail,
  deleteFromS3,
  deletePhotoAllVersions,
  BUCKET_NAME,
}; 