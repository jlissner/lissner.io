-- SQLite Schema for Photo Management System
-- Optimized for efficient querying and pagination

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Albums (upload sessions)
CREATE TABLE albums (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    photo_count INTEGER DEFAULT 0,
    cover_photo_id TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (cover_photo_id) REFERENCES photos(id)
);

-- Photos table
CREATE TABLE photos (
    id TEXT PRIMARY KEY,
    album_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    caption TEXT,
    
    -- URLs
    thumbnail_url TEXT NOT NULL,
    url TEXT NOT NULL,
    original_url TEXT NOT NULL,
    
    -- S3 keys
    thumbnail_s3_key TEXT NOT NULL,
    s3_key TEXT NOT NULL,
    original_s3_key TEXT NOT NULL,
    
    -- Metadata
    uploaded_by TEXT NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    taken_at DATETIME,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    
    -- Location (stored as separate columns for indexing)
    latitude REAL,
    longitude REAL,
    altitude REAL,
    
    FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Tags table
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Photo-Tag relationships (many-to-many)
CREATE TABLE photo_tags (
    photo_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (photo_id, tag_id),
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Comments
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (author) REFERENCES users(id)
);

-- Reactions
CREATE TABLE reactions (
    id TEXT PRIMARY KEY,
    photo_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('like', 'love', 'laugh')),
    author TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(photo_id, author), -- One reaction per user per photo
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    FOREIGN KEY (author) REFERENCES users(id)
);

-- Indexes for efficient querying
CREATE INDEX idx_photos_album_uploaded_at ON photos(album_id, uploaded_at DESC);
CREATE INDEX idx_photos_uploaded_by_at ON photos(uploaded_by, uploaded_at DESC);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX idx_photos_taken_at ON photos(taken_at DESC);
CREATE INDEX idx_photos_location ON photos(latitude, longitude);

CREATE INDEX idx_photo_tags_tag ON photo_tags(tag_id);
CREATE INDEX idx_photo_tags_photo ON photo_tags(photo_id);

CREATE INDEX idx_comments_photo ON comments(photo_id, created_at DESC);
CREATE INDEX idx_reactions_photo ON reactions(photo_id);

CREATE INDEX idx_albums_created_by_at ON albums(created_by, created_at DESC);
CREATE INDEX idx_albums_updated_at ON albums(updated_at DESC);

-- Views for common queries
CREATE VIEW photo_details AS
SELECT 
    p.*,
    a.name as album_name,
    u.display_name as uploader_name,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT r.id) as reaction_count,
    GROUP_CONCAT(t.name, ',') as tags
FROM photos p
LEFT JOIN albums a ON p.album_id = a.id
LEFT JOIN users u ON p.uploaded_by = u.id
LEFT JOIN comments c ON p.id = c.photo_id
LEFT JOIN reactions r ON p.id = r.photo_id
LEFT JOIN photo_tags pt ON p.id = pt.photo_id
LEFT JOIN tags t ON pt.tag_id = t.id
GROUP BY p.id;

-- Trigger to update album photo count
CREATE TRIGGER update_album_count_insert 
AFTER INSERT ON photos
BEGIN
    UPDATE albums 
    SET photo_count = photo_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.album_id;
END;

CREATE TRIGGER update_album_count_delete 
AFTER DELETE ON photos
BEGIN
    UPDATE albums 
    SET photo_count = photo_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.album_id;
END; 