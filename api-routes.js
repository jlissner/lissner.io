// SQLite-based API Routes
// Solves all pagination and filtering issues

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Initialize SQLite connection
let db;
async function initDB() {
  db = await open({
    filename: './photos.db',
    driver: sqlite3.Database
  });
}

const router = express.Router();

// 🎯 ALBUMS API - Perfect pagination!
// GET /api/albums?page=1&limit=10&user=john@email.com
router.get('/albums', async (req, res) => {
  const { page = 1, limit = 10, user, sort = 'updated_at' } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT a.*, u.display_name as creator_name,
           COUNT(p.id) as actual_photo_count
    FROM albums a
    LEFT JOIN users u ON a.created_by = u.id
    LEFT JOIN photos p ON a.id = p.album_id
  `;
  let params = [];
  
  if (user) {
    query += ' WHERE a.created_by = ?';
    params.push(user);
  }
  
  query += ` 
    GROUP BY a.id 
    ORDER BY a.${sort} DESC 
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  
  const albums = await db.all(query, params);
  res.json({ albums, page: parseInt(page), hasMore: albums.length === parseInt(limit) });
});

// 🎯 ALBUM PHOTOS - Efficient album-specific pagination!
// GET /api/albums/123/photos?page=1&limit=20
router.get('/albums/:albumId/photos', async (req, res) => {
  const { albumId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  const photos = await db.all(`
    SELECT p.*, 
           a.name as album_name,
           u.display_name as uploader_name,
           COUNT(DISTINCT c.id) as comment_count,
           COUNT(DISTINCT r.id) as reaction_count,
           GROUP_CONCAT(DISTINCT t.name) as tags
    FROM photos p
    LEFT JOIN albums a ON p.album_id = a.id
    LEFT JOIN users u ON p.uploaded_by = u.id
    LEFT JOIN comments c ON p.id = c.photo_id
    LEFT JOIN reactions r ON p.id = r.photo_id
    LEFT JOIN photo_tags pt ON p.id = pt.photo_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.album_id = ?
    GROUP BY p.id
    ORDER BY p.uploaded_at DESC
    LIMIT ? OFFSET ?
  `, [albumId, limit, offset]);
  
  res.json({ 
    photos, 
    page: parseInt(page), 
    hasMore: photos.length === parseInt(limit)
  });
});

// 🎯 PHOTOS API - Multi-filter support!
// GET /api/photos?tags=family,vacation&user=john@email.com&page=1&limit=20
router.get('/photos', async (req, res) => {
  const { 
    page = 1, 
    limit = 20, 
    tags, 
    user, 
    album,
    startDate,
    endDate,
    hasLocation,
    sort = 'uploaded_at'
  } = req.query;
  
  const offset = (page - 1) * limit;
  let query = `
    SELECT DISTINCT p.*, 
           a.name as album_name,
           u.display_name as uploader_name,
           COUNT(DISTINCT c.id) as comment_count,
           COUNT(DISTINCT r.id) as reaction_count,
           GROUP_CONCAT(DISTINCT t.name) as tags
    FROM photos p
    LEFT JOIN albums a ON p.album_id = a.id
    LEFT JOIN users u ON p.uploaded_by = u.id
    LEFT JOIN comments c ON p.id = c.photo_id
    LEFT JOIN reactions r ON p.id = r.photo_id
    LEFT JOIN photo_tags pt ON p.id = pt.photo_id
    LEFT JOIN tags t ON pt.tag_id = t.id
  `;
  
  const conditions = [];
  const params = [];
  
  // Filter by tags (AND logic - photo must have ALL specified tags)
  if (tags) {
    const tagList = tags.split(',');
    query += `
      WHERE p.id IN (
        SELECT pt.photo_id 
        FROM photo_tags pt 
        JOIN tags t ON pt.tag_id = t.id 
        WHERE t.name IN (${tagList.map(() => '?').join(',')})
        GROUP BY pt.photo_id 
        HAVING COUNT(DISTINCT t.name) = ?
      )
    `;
    params.push(...tagList, tagList.length);
  }
  
  // Additional filters
  if (user) {
    conditions.push('p.uploaded_by = ?');
    params.push(user);
  }
  
  if (album) {
    conditions.push('p.album_id = ?');
    params.push(album);
  }
  
  if (startDate) {
    conditions.push('p.uploaded_at >= ?');
    params.push(startDate);
  }
  
  if (endDate) {
    conditions.push('p.uploaded_at <= ?');
    params.push(endDate);
  }
  
  if (hasLocation === 'true') {
    conditions.push('p.latitude IS NOT NULL AND p.longitude IS NOT NULL');
  }
  
  // Add WHERE or AND based on whether tags filter was used
  if (conditions.length > 0) {
    if (tags) {
      query += ` AND ${conditions.join(' AND ')}`;
    } else {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
  }
  
  query += `
    GROUP BY p.id
    ORDER BY p.${sort} DESC
    LIMIT ? OFFSET ?
  `;
  params.push(limit, offset);
  
  const photos = await db.all(query, params);
  res.json({ 
    photos, 
    page: parseInt(page), 
    hasMore: photos.length === parseInt(limit)
  });
});

// 🎯 RECENT ACTIVITY - Efficient aggregation!
// GET /api/activity/recent?days=7
router.get('/activity/recent', async (req, res) => {
  const { days = 7 } = req.query;
  
  const activity = await db.all(`
    SELECT 
      u.id,
      u.email,
      u.display_name,
      COUNT(p.id) as photo_count,
      MAX(p.uploaded_at) as latest_upload,
      -- Get the most recent photo for preview
      (SELECT json_object(
         'id', p2.id,
         'thumbnail_url', p2.thumbnail_url,
         'caption', p2.caption
       ) FROM photos p2 
       WHERE p2.uploaded_by = u.id 
       ORDER BY p2.uploaded_at DESC 
       LIMIT 1
      ) as latest_photo
    FROM users u
    LEFT JOIN photos p ON u.id = p.uploaded_by 
      AND p.uploaded_at > datetime('now', '-${days} days')
    GROUP BY u.id, u.email, u.display_name
    HAVING photo_count > 0
    ORDER BY latest_upload DESC
    LIMIT 10
  `);
  
  res.json({ activity });
});

// 🎯 PHOTO DETAILS - Single query with all relations!
// GET /api/photos/123
router.get('/photos/:photoId', async (req, res) => {
  const { photoId } = req.params;
  
  const photo = await db.get(`
    SELECT p.*, 
           a.name as album_name,
           u.display_name as uploader_name,
           GROUP_CONCAT(DISTINCT t.name) as tags
    FROM photos p
    LEFT JOIN albums a ON p.album_id = a.id
    LEFT JOIN users u ON p.uploaded_by = u.id
    LEFT JOIN photo_tags pt ON p.id = pt.photo_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.id = ?
    GROUP BY p.id
  `, [photoId]);
  
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found' });
  }
  
  // Get comments and reactions separately for cleaner data
  const [comments, reactions] = await Promise.all([
    db.all(`
      SELECT c.*, u.display_name as author_name
      FROM comments c
      LEFT JOIN users u ON c.author = u.id
      WHERE c.photo_id = ?
      ORDER BY c.created_at ASC
    `, [photoId]),
    
    db.all(`
      SELECT r.*, u.display_name as author_name
      FROM reactions r
      LEFT JOIN users u ON r.author = u.id
      WHERE r.photo_id = ?
      ORDER BY r.created_at DESC
    `, [photoId])
  ]);
  
  photo.comments = comments;
  photo.reactions = reactions;
  photo.tags = photo.tags ? photo.tags.split(',') : [];
  
  res.json({ photo });
});

// 🎯 SEARCH API - Full-text search capability!
// GET /api/search?q=family vacation&limit=20
router.get('/search', async (req, res) => {
  const { q, limit = 20 } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter required' });
  }
  
  const photos = await db.all(`
    SELECT DISTINCT p.*, 
           a.name as album_name,
           u.display_name as uploader_name,
           GROUP_CONCAT(DISTINCT t.name) as tags
    FROM photos p
    LEFT JOIN albums a ON p.album_id = a.id
    LEFT JOIN users u ON p.uploaded_by = u.id
    LEFT JOIN photo_tags pt ON p.id = pt.photo_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.caption LIKE ? 
       OR t.name LIKE ?
       OR a.name LIKE ?
    GROUP BY p.id
    ORDER BY p.uploaded_at DESC
    LIMIT ?
  `, [`%${q}%`, `%${q}%`, `%${q}%`, limit]);
  
  res.json({ photos, query: q });
});

// 🎯 STATISTICS API - Quick analytics!
// GET /api/stats
router.get('/stats', async (req, res) => {
  const [
    totalPhotos,
    totalAlbums,
    totalUsers,
    recentUploads,
    topTags
  ] = await Promise.all([
    db.get('SELECT COUNT(*) as count FROM photos'),
    db.get('SELECT COUNT(*) as count FROM albums'),
    db.get('SELECT COUNT(*) as count FROM users'),
    db.get(`
      SELECT COUNT(*) as count 
      FROM photos 
      WHERE uploaded_at > datetime('now', '-7 days')
    `),
    db.all(`
      SELECT t.name, COUNT(*) as usage_count
      FROM tags t
      JOIN photo_tags pt ON t.id = pt.tag_id
      GROUP BY t.id, t.name
      ORDER BY usage_count DESC
      LIMIT 10
    `)
  ]);
  
  res.json({
    totalPhotos: totalPhotos.count,
    totalAlbums: totalAlbums.count,
    totalUsers: totalUsers.count,
    recentUploads: recentUploads.count,
    topTags
  });
});

module.exports = { router, initDB }; 