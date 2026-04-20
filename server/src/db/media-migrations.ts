import type Database from "better-sqlite3";

type MigrationStep = {
  version: number;
  apply: (db: Database.Database) => void;
};

function ensureMigrationsTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function getAppliedVersions(db: Database.Database): Set<number> {
  const rows = db
    .prepare("SELECT version FROM schema_migrations ORDER BY version ASC")
    .all() as Array<{ version: number }>;
  return new Set(rows.map((r) => r.version));
}

function markMigrationApplied(db: Database.Database, version: number): void {
  db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (?)").run(version);
}

const MEDIA_BASE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL
  )
`;

const EMBEDDINGS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS embeddings (
    media_id TEXT PRIMARY KEY REFERENCES media(id),
    embedding TEXT NOT NULL,
    indexed_at TEXT NOT NULL
  )
`;

const PERSON_NAMES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS person_names (
    person_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )
`;

const IMAGE_PEOPLE_BASE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS image_people (
    media_id TEXT NOT NULL,
    person_id INTEGER NOT NULL,
    PRIMARY KEY (media_id, person_id),
    FOREIGN KEY (media_id) REFERENCES media(id)
  )
`;

function addColumnIfMissing(
  db: Database.Database,
  table: string,
  column: string,
  columnSqlType: string
): void {
  const cols = (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
    (c) => c.name
  );
  if (!cols.includes(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${columnSqlType}`);
  }
}

const migrations: MigrationStep[] = [
  {
    version: 1,
    apply: (db) => {
      db.exec(MEDIA_BASE_TABLE_SQL);
      db.exec(EMBEDDINGS_TABLE_SQL);
      db.exec(PERSON_NAMES_TABLE_SQL);
      db.exec(IMAGE_PEOPLE_BASE_TABLE_SQL);
    },
  },
  {
    version: 2,
    apply: (db) => {
      addColumnIfMissing(db, "image_people", "x", "REAL");
      addColumnIfMissing(db, "image_people", "y", "REAL");
      addColumnIfMissing(db, "image_people", "width", "REAL");
      addColumnIfMissing(db, "image_people", "height", "REAL");
      addColumnIfMissing(db, "image_people", "confidence", "REAL");
    },
  },
  {
    version: 3,
    apply: (db) => addColumnIfMissing(db, "media", "date_taken", "TEXT"),
  },
  {
    version: 4,
    apply: (db) => addColumnIfMissing(db, "media", "latitude", "REAL"),
  },
  {
    version: 5,
    apply: (db) => addColumnIfMissing(db, "media", "longitude", "REAL"),
  },
  {
    version: 6,
    apply: (db) => addColumnIfMissing(db, "media", "owner_id", "INTEGER"),
  },
  {
    version: 7,
    apply: (db) => addColumnIfMissing(db, "media", "backed_up_at", "TEXT"),
  },
  {
    version: 8,
    apply: (db) => addColumnIfMissing(db, "media", "motion_companion_id", "TEXT"),
  },
  {
    version: 9,
    apply: (db) => addColumnIfMissing(db, "media", "hide_from_gallery", "INTEGER DEFAULT 0"),
  },
  {
    version: 10,
    apply: (db) => addColumnIfMissing(db, "image_people", "source", "TEXT DEFAULT 'auto'"),
  },
  {
    version: 11,
    apply: (db) => addColumnIfMissing(db, "media", "perceptual_hash", "BLOB"),
  },
];

export function runMediaMigrations(db: Database.Database): void {
  ensureMigrationsTable(db);
  const applied = getAppliedVersions(db);
  for (const step of migrations) {
    if (applied.has(step.version)) continue;
    step.apply(db);
    markMigrationApplied(db, step.version);
  }
}
