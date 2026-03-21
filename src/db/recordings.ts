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
  event_type: string | null;
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
  event_type?: string | null;
}

export interface RecordingQuery {
  camera?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  eventType?: string;
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
    INSERT OR IGNORE INTO recordings (camera, date, timestamp, file, path, size, snapshot_key, description, event_type)
    VALUES (@camera, @date, @timestamp, @file, @path, @size, @snapshot_key, @description, @event_type)
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
    event_type: row.event_type ?? 'motion',
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
  if (query.eventType) {
    conditions.push("r.event_type = @eventType");
    params.eventType = query.eventType;
  }

  let joinClause = "";
  if (query.search) {
    joinClause = "JOIN recordings_fts ON recordings_fts.rowid = r.id";
    conditions.push("recordings_fts MATCH @search");
    // Wrap in double-quotes to force literal phrase matching and prevent
    // FTS5 query injection (operators like NOT, OR, *, NEAR, column:filters)
    params.search = '"' + query.search.replace(/"/g, '""') + '"';
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

export function getRecordingByPath(recordingPath: string): RecordingRow | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM recordings WHERE path = ?").get(recordingPath) as RecordingRow) ?? null;
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

export interface TimelineRecording {
  id: number;
  timestamp: string;
  event_type: string | null;
  snapshot_key: string | null;
  path: string;
}

export function queryTimelineRecordings(
  camera: string,
  from: string,
  to: string,
  eventType?: string
): TimelineRecording[] {
  const db = getDb();
  const conditions: string[] = [
    "camera = @camera",
    "timestamp >= @from",
    "timestamp <= @to",
  ];
  const params: Record<string, string> = { camera, from, to };

  if (eventType) {
    conditions.push("event_type = @eventType");
    params.eventType = eventType;
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;
  return db
    .prepare(
      `SELECT id, timestamp, event_type, snapshot_key, path FROM recordings ${whereClause} ORDER BY timestamp ASC`
    )
    .all(params) as TimelineRecording[];
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
