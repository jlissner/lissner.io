-- Media + API auth schema (Postgres). Mirrors SQLite tables used by @lissner/server.
-- Applied by: npm run db:migrate:media
-- Version tracking is owned by packages/db/src/migrate.ts (do not insert into schema_migrations here).

CREATE TABLE IF NOT EXISTS person_names (
  person_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL,
  date_taken TIMESTAMPTZ,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  owner_id INTEGER,
  backed_up_at TIMESTAMPTZ,
  motion_companion_id TEXT,
  hide_from_gallery BOOLEAN NOT NULL DEFAULT FALSE,
  perceptual_hash BYTEA,
  file_issue_code TEXT,
  file_issue_detail TEXT,
  file_issue_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS embeddings (
  media_id TEXT PRIMARY KEY REFERENCES media (id) ON DELETE CASCADE,
  embedding TEXT NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS image_people (
  media_id TEXT NOT NULL REFERENCES media (id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES person_names (person_id),
  x DOUBLE PRECISION,
  y DOUBLE PRECISION,
  width DOUBLE PRECISION,
  height DOUBLE PRECISION,
  confidence DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'auto',
  PRIMARY KEY (media_id, person_id)
);

CREATE TABLE IF NOT EXISTS media_tags (
  media_id TEXT NOT NULL REFERENCES media (id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (media_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_media_tags_tag ON media_tags (tag);
CREATE INDEX IF NOT EXISTS idx_media_owner ON media (owner_id);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON media (uploaded_at);
CREATE INDEX IF NOT EXISTS idx_image_people_person ON image_people (person_id);

CREATE TABLE IF NOT EXISTS auth_whitelist (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by_user_id INTEGER,
  person_id INTEGER REFERENCES person_names (person_id)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  person_id INTEGER REFERENCES person_names (person_id)
);

CREATE TABLE IF NOT EXISTS user_people (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES person_names (person_id),
  PRIMARY KEY (user_id, person_id)
);

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  login_code TEXT
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  family_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);
