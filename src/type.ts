// src/types.ts

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  sync_status?: 'pending' | 'synced' | 'error';
  server_id?: string;
last_synced_at?: string | null;
}

export interface SyncQueueItem {
  id: string;
  task_id: string;
  operation: 'create' | 'update' | 'delete';
  data_json: string; // stored as JSON string in DB
  created_at?: string;
  retry_count?: number;
  error_message?: string;
}

export interface SyncResult {
  total: number;
  success:  number;
  failed: number;
  conflicts: number;
}

export interface BatchSyncResponse {
  items: SyncQueueItem[];
  processed_items: string[]; // list of item IDs successfully processed
}
