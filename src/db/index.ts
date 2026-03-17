import Database from "better-sqlite3";
import path from "path";
import { runMigrations } from "./migrate.js";
import { log } from "../logger.js";

const CONFIG_DIR = process.env.CONFIG_PATH || path.join(process.cwd(), "config");
const DB_PATH = path.join(CONFIG_DIR, "metadata.db");

let db: Database.Database | null = null;

export function initDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  runMigrations(db);
  log.info(`[db] opened ${DB_PATH}`);

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error("Database not initialized — call initDb() first");
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    log.info("[db] closed");
  }
}

/** For testing: initialize an in-memory database with migrations */
export function initTestDb(): Database.Database {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}
