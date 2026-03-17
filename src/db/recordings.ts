import { getDb } from "./index.js";

export interface RecordingRow {
  id: number;
  camera: string;
  date: string;
  timestamp: string;
  file: string;
  path: string;
  size: number;
  snapshot_key: string | null;
  description: string | null;
  created_at: string;
}

export interface RecordingInsert {
  camera: string;
  date: string;
  timestamp: string;
  file: string;
  path: string;
  size: number;
  snapshot_key?: string | null;
  description?: string | null;
}

export interface RecordingQuery {
  camera?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export function insertRecording(row: RecordingInsert): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO recordings (camera, date, timestamp, file, path, size, snapshot_key, description)
    VALUES (@camera, @date, @timestamp, @file, @path, @size, @snapshot_key, @description)
  `);
  stmt.run({
    camera: row.camera,
    date: row.date,
    timestamp: row.timestamp,
    file: row.file,
    path: row.path,
    size: row.size,
    snapshot_key: row.snapshot_key ?? null,
    description: row.description ?? null,
  });
}

export function queryRecordings(query: RecordingQuery = {}): PaginatedResult<RecordingRow> {
  const db = getDb();
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;

  const conditions: string[] = [];
  const params: Record<string, string | number> = {};

  if (query.camera) {
    conditions.push("r.camera = @camera");
    params.camera = query.camera;
  }
  if (query.dateFrom) {
    conditions.push("r.date >= @dateFrom");
    params.dateFrom = query.dateFrom;
  }
  if (query.dateTo) {
    conditions.push("r.date <= @dateTo");
    params.dateTo = query.dateTo;
  }

  let joinClause = "";
  if (query.search) {
    joinClause = "JOIN recordings_fts ON recordings_fts.rowid = r.id";
    conditions.push("recordings_fts MATCH @search");
    params.search = query.search;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countStmt = db.prepare(
    `SELECT COUNT(*) as total FROM recordings r ${joinClause} ${whereClause}`
  );
  const { total } = countStmt.get(params) as { total: number };

  const dataStmt = db.prepare(
    `SELECT r.* FROM recordings r ${joinClause} ${whereClause} ORDER BY r.date DESC, r.file DESC LIMIT @limit OFFSET @offset`
  );
  const data = dataStmt.all({ ...params, limit, offset }) as RecordingRow[];

  return { data, total, limit, offset };
}

export function deleteRecordingByPath(recordingPath: string): void {
  const db = getDb();
  db.prepare("DELETE FROM recordings WHERE path = ?").run(recordingPath);
}

export function deleteRecordingsOlderThan(cutoffDate: string): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM recordings WHERE date < ?").run(cutoffDate);
  return result.changes;
}

export function getDistinctCameras(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT DISTINCT camera FROM recordings ORDER BY camera").all() as { camera: string }[];
  return rows.map((r) => r.camera);
}

export function getRecordingsWithoutDescription(limit: number): RecordingRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM recordings WHERE description IS NULL ORDER BY date DESC LIMIT ?"
    )
    .all(limit) as RecordingRow[];
}

export function updateRecordingDescription(
  id: number,
  description: string,
  snapshotKey?: string
): void {
  const db = getDb();
  if (snapshotKey !== undefined) {
    db.prepare(
      "UPDATE recordings SET description = ?, snapshot_key = ? WHERE id = ?"
    ).run(description, snapshotKey, id);
  } else {
    db.prepare("UPDATE recordings SET description = ? WHERE id = ?").run(
      description,
      id
    );
  }
}

export function backfillFromStorage(recordings: Array<{ camera: string; date: string; file: string; path: string; size: number; snapshot_key?: string }>): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO recordings (camera, date, timestamp, file, path, size, snapshot_key)
    VALUES (@camera, @date, @timestamp, @file, @path, @size, @snapshot_key)
  `);

  const insertAll = db.transaction((rows: typeof recordings) => {
    let count = 0;
    for (const row of rows) {
      // Derive ISO timestamp from date + file (HH-MM-SS.mp4)
      const time = row.file.replace(".mp4", "").replace(".jpg", "").replace(/-/g, ":");
      const timestamp = `${row.date}T${time}`;
      const result = stmt.run({
        camera: row.camera,
        date: row.date,
        timestamp,
        file: row.file,
        path: row.path,
        size: row.size,
        snapshot_key: row.snapshot_key ?? null,
      });
      if (result.changes > 0) count++;
    }
    return count;
  });

  return insertAll(recordings);
}

export function backfillSnapshotKeys(recordings: Array<{ path: string; snapshot_key?: string }>): number {
  const db = getDb();
  const stmt = db.prepare(
    "UPDATE recordings SET snapshot_key = ? WHERE path = ? AND snapshot_key IS NULL"
  );
  const run = db.transaction((rows: typeof recordings) => {
    let count = 0;
    for (const row of rows) {
      if (!row.snapshot_key) continue;
      const result = stmt.run(row.snapshot_key, row.path);
      if (result.changes > 0) count++;
    }
    return count;
  });
  return run(recordings);
}
