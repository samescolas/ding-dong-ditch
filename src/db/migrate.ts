import type Database from "better-sqlite3";

const MIGRATIONS: Array<(db: Database.Database) => void> = [
  // Version 0 → 1: initial schema
  (db) => {
    db.exec(`
      CREATE TABLE recordings (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        camera       TEXT    NOT NULL,
        date         TEXT    NOT NULL,
        timestamp    TEXT    NOT NULL,
        file         TEXT    NOT NULL,
        path         TEXT    NOT NULL UNIQUE,
        size         INTEGER NOT NULL DEFAULT 0,
        snapshot_key TEXT,
        description  TEXT,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_recordings_camera ON recordings(camera);
      CREATE INDEX idx_recordings_date   ON recordings(date);

      CREATE VIRTUAL TABLE recordings_fts USING fts5(
        description, content='recordings', content_rowid='id'
      );

      CREATE TRIGGER recordings_ai AFTER INSERT ON recordings WHEN new.description IS NOT NULL
        BEGIN INSERT INTO recordings_fts(rowid, description) VALUES (new.id, new.description); END;

      CREATE TRIGGER recordings_ad AFTER DELETE ON recordings
        BEGIN INSERT INTO recordings_fts(recordings_fts, rowid, description) VALUES('delete', old.id, old.description); END;

      CREATE TRIGGER recordings_au AFTER UPDATE OF description ON recordings
        BEGIN
          INSERT INTO recordings_fts(recordings_fts, rowid, description) VALUES('delete', old.id, old.description);
          INSERT INTO recordings_fts(rowid, description) VALUES (new.id, new.description);
        END;
    `);
  },
  // Version 1 → 2: add event_type column
  (db) => {
    db.exec(`ALTER TABLE recordings ADD COLUMN event_type TEXT DEFAULT 'motion'`);
  },
  // Version 2 → 3: guard FTS triggers against NULL descriptions
  (db) => {
    db.exec(`
      DROP TRIGGER IF EXISTS recordings_ad;
      CREATE TRIGGER recordings_ad AFTER DELETE ON recordings WHEN old.description IS NOT NULL
        BEGIN INSERT INTO recordings_fts(recordings_fts, rowid, description)
              VALUES('delete', old.id, old.description); END;

      DROP TRIGGER IF EXISTS recordings_au;
      CREATE TRIGGER recordings_au AFTER UPDATE OF description ON recordings
        BEGIN
          INSERT INTO recordings_fts(recordings_fts, rowid, description)
            SELECT 'delete', old.id, old.description WHERE old.description IS NOT NULL;
          INSERT INTO recordings_fts(rowid, description)
            SELECT new.id, new.description WHERE new.description IS NOT NULL;
        END;
    `);
  },
];

export function runMigrations(db: Database.Database): void {
  const currentVersion = db.pragma("user_version", { simple: true }) as number;

  if (currentVersion >= MIGRATIONS.length) return;

  const migrate = db.transaction(() => {
    for (let i = currentVersion; i < MIGRATIONS.length; i++) {
      MIGRATIONS[i](db);
    }
    db.pragma(`user_version = ${MIGRATIONS.length}`);
  });

  migrate();
}
