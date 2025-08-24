# Migration Strategy: DynamoDB → SQLite

## 📋 Pre-Migration Checklist

### 1. VPS Setup
```bash
# Choose a provider (recommend Hetzner for cost)
# Create VPS: 2GB RAM, 1 CPU, 40GB SSD (~$4-6/month)

# Install dependencies
sudo apt update
sudo apt install sqlite3 nodejs npm nginx certbot

# Setup application directory
sudo mkdir -p /var/www/photo-app
sudo chown $USER:$USER /var/www/photo-app
```

### 2. Database Setup
```bash
# Initialize SQLite database
cd /var/www/photo-app
sqlite3 photos.db < schema.sql

# Set proper permissions
chmod 644 photos.db
```

### 3. Backup Current Data
```bash
# Export all DynamoDB data
aws dynamodb scan --table-name Photos --output json > photos-backup.json
aws dynamodb scan --table-name Albums --output json > albums-backup.json
```

## 🔄 Migration Steps

### Phase 1: Data Migration (1-2 hours)
```python
# migration-script.py
import json
import sqlite3
import boto3
from datetime import datetime

def migrate_dynamodb_to_sqlite():
    # Connect to SQLite
    conn = sqlite3.connect('photos.db')
    cursor = conn.cursor()
    
    # Connect to DynamoDB
    dynamodb = boto3.resource('dynamodb')
    photos_table = dynamodb.Table('Photos')
    
    # Scan all photos from DynamoDB
    response = photos_table.scan()
    photos = response['Items']
    
    # Continue scanning if there are more items
    while 'LastEvaluatedKey' in response:
        response = photos_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        photos.extend(response['Items'])
    
    print(f"Found {len(photos)} photos to migrate")
    
    # Transform and insert data
    for photo in photos:
        # Transform DynamoDB item to SQLite format
        cursor.execute("""
            INSERT OR REPLACE INTO photos (
                id, album_id, filename, caption,
                thumbnail_url, url, original_url,
                thumbnail_s3_key, s3_key, original_s3_key,
                uploaded_by, uploaded_at, taken_at,
                latitude, longitude, altitude
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            photo['id'],
            photo.get('uploadSessionId', 'unknown'),
            photo.get('filename', ''),
            photo.get('caption', ''),
            photo.get('thumbnailUrl', ''),
            photo.get('url', ''),
            photo.get('originalUrl', ''),
            photo.get('thumbnailS3Key', ''),
            photo.get('s3Key', ''),
            photo.get('originalS3Key', ''),
            photo['uploadedBy'],
            photo['uploadedAt'],
            photo.get('takenAt'),
            photo.get('location', {}).get('latitude'),
            photo.get('location', {}).get('longitude'),
            photo.get('location', {}).get('altitude')
        ))
        
        # Migrate tags
        for tag in photo.get('tags', []):
            cursor.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag,))
            cursor.execute("""
                INSERT OR IGNORE INTO photo_tags (photo_id, tag_id)
                SELECT ?, id FROM tags WHERE name = ?
            """, (photo['id'], tag))
        
        # Migrate comments
        for comment in photo.get('comments', []):
            cursor.execute("""
                INSERT OR REPLACE INTO comments (id, photo_id, content, author, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                comment['id'],
                photo['id'],
                comment['content'],
                comment['author'],
                comment['createdAt']
            ))
        
        # Migrate reactions
        for reaction in photo.get('reactions', []):
            cursor.execute("""
                INSERT OR REPLACE INTO reactions (id, photo_id, type, author, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                reaction['id'],
                photo['id'],
                reaction['type'],
                reaction['author'],
                reaction['createdAt']
            ))
    
    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate_dynamodb_to_sqlite()
```

### Phase 2: API Deployment (30 minutes)
```bash
# Deploy new API code
git clone your-repo /var/www/photo-app
cd /var/www/photo-app
npm install

# Setup environment
cp .env.example .env
# Edit .env with your S3 credentials and other settings

# Start with PM2
npm install -g pm2
pm2 start npm --name "photo-api" -- start
pm2 startup
pm2 save
```

### Phase 3: Frontend Update (15 minutes)
```bash
# Update frontend API calls
# Replace old API calls with new SQLite-based ones
# Deploy frontend changes

# For Next.js:
npm run build
pm2 restart photo-api
```

### Phase 4: Verification (15 minutes)
```sql
-- Verify data integrity
SELECT COUNT(*) as total_photos FROM photos;
SELECT COUNT(*) as total_albums FROM albums;
SELECT COUNT(*) as total_tags FROM tags;

-- Check a few sample records
SELECT * FROM photos LIMIT 5;
SELECT p.caption, GROUP_CONCAT(t.name) as tags 
FROM photos p 
LEFT JOIN photo_tags pt ON p.id = pt.photo_id 
LEFT JOIN tags t ON pt.tag_id = t.id 
GROUP BY p.id 
LIMIT 5;
```

## 🧪 Testing Strategy

### 1. Performance Testing
```bash
# Test album pagination (should be fast!)
curl "localhost:3001/api/albums/123/photos?page=1&limit=20"

# Test complex filtering
curl "localhost:3001/api/photos?tags=family,vacation&user=john@email.com"

# Test search
curl "localhost:3001/api/search?q=christmas"
```

### 2. Load Testing
```bash
# Install artillery
npm install -g artillery

# Create test config (artillery.yml)
# Run load tests
artillery run artillery.yml
```

## 🔄 Rollback Plan

### If Issues Arise:
1. **Keep DynamoDB Running**: Don't delete DynamoDB tables immediately
2. **DNS Switch**: Update DNS to point back to old API
3. **Code Rollback**: Deploy previous frontend version
4. **Investigate**: Fix SQLite issues offline

### Gradual Migration Option:
```javascript
// Hybrid API that checks both sources
const getPhotos = async (req, res) => {
  try {
    // Try SQLite first
    const sqliteResult = await getSQLitePhotos(req.query);
    res.json(sqliteResult);
  } catch (error) {
    // Fallback to DynamoDB
    console.log('SQLite failed, falling back to DynamoDB');
    const dynamoResult = await getDynamoPhotos(req.query);
    res.json(dynamoResult);
  }
};
```

## 📊 Success Metrics

### Before/After Comparison:
- **Album loading time**: DynamoDB ~2-5 seconds → SQLite ~200-500ms
- **Multi-filter queries**: DynamoDB complex/impossible → SQLite instant
- **API calls per album view**: DynamoDB 10-50 → SQLite 1-5
- **Monthly cost**: DynamoDB ~$5.55 → SQLite ~$4-6 + time

### Monitor These:
- Response times for all endpoints
- Error rates
- User complaints about loading speeds
- Database file size growth

## 🚀 Post-Migration Optimizations

### 1. Add Database Indexes
```sql
-- Add more indexes based on usage patterns
CREATE INDEX idx_photos_caption_fts ON photos(caption);
CREATE INDEX idx_photos_upload_date_range ON photos(uploaded_at, uploaded_by);
```

### 2. Setup Automated Backups
```bash
# Daily SQLite backup
crontab -e
# Add: 0 2 * * * cp /var/www/photo-app/photos.db /backups/photos-$(date +%Y%m%d).db
```

### 3. Enable WAL Mode
```sql
-- Enable Write-Ahead Logging for better concurrency
PRAGMA journal_mode=WAL;
```

This migration should solve all your pagination and filtering issues while maintaining similar costs and adding much more flexibility! 