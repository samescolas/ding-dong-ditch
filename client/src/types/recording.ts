export interface Recording {
  id: number;
  camera: string;
  date: string;
  timestamp?: string;
  file: string;
  path: string;
  size: number;
  snapshot_key: string | null;
  description: string | null;
  created_at?: string;
}

export interface PaginatedResult {
  data: Recording[];
  total: number;
  limit: number;
  offset: number;
}

export interface RecordingFilters {
  camera: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}
