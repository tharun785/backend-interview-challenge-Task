// import axios from 'axios';
// import { Task, SyncQueueItem, SyncResult, BatchSyncRequest, BatchSyncResponse } from '../types';
// import { Database } from '../db/database';
// import { TaskService } from './taskService';

// export class SyncService {
//   private apiUrl: string;
  
//   constructor(
//     private db: Database,
//     private taskService: TaskService,
//     apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
//   ) {
//     this.apiUrl = apiUrl;
//   }

//   async sync(): Promise<SyncResult> {
//     // TODO: Main sync orchestration method
//     // 1. Get all items from sync queue
//     // 2. Group items by batch (use SYNC_BATCH_SIZE from env)
//     // 3. Process each batch
//     // 4. Handle success/failure for each item
//     // 5. Update sync status in database
//     // 6. Return sync result summary
//     throw new Error('Not implemented');
//   }

//   async addToSyncQueue(taskId: string, operation: 'create' | 'update' | 'delete', data: Partial<Task>): Promise<void> {
//     // TODO: Add operation to sync queue
//     // 1. Create sync queue item
//     // 2. Store serialized task data
//     // 3. Insert into sync_queue table
//     throw new Error('Not implemented');
//   }

//   private async processBatch(items: SyncQueueItem[]): Promise<BatchSyncResponse> {
//     // TODO: Process a batch of sync items
//     // 1. Prepare batch request
//     // 2. Send to server
//     // 3. Handle response
//     // 4. Apply conflict resolution if needed
//     throw new Error('Not implemented');
//   }

//   private async resolveConflict(localTask: Task, serverTask: Task): Promise<Task> {
//     // TODO: Implement last-write-wins conflict resolution
//     // 1. Compare updated_at timestamps
//     // 2. Return the more recent version
//     // 3. Log conflict resolution decision
//     throw new Error('Not implemented');
//   }

//   private async updateSyncStatus(taskId: string, status: 'synced' | 'error', serverData?: Partial<Task>): Promise<void> {
//     // TODO: Update task sync status
//     // 1. Update sync_status field
//     // 2. Update server_id if provided
//     // 3. Update last_synced_at timestamp
//     // 4. Remove from sync queue if successful
//     throw new Error('Not implemented');
//   }

//   private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
//     // TODO: Handle sync errors
//     // 1. Increment retry count
//     // 2. Store error message
//     // 3. If retry count exceeds limit, mark as permanent failure
//     throw new Error('Not implemented');
//   }

//   async checkConnectivity(): Promise<boolean> {
//     // TODO: Check if server is reachable
//     // 1. Make a simple health check request
//     // 2. Return true if successful, false otherwise
//     try {
//       await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
//       return true;
//     } catch {
//       return false;
//     }
//   }
// }











import axios from 'axios';
import { Database } from '../db/database';
import { Task, SyncQueueItem, SyncResult, BatchSyncResponse } from '../types';
import { randomUUID } from 'crypto';

export class SyncService {
  private apiUrl: string;
  private db: Database;

  constructor(
    db: Database,
    apiUrl: string = process.env.API_BASE_URL || 'http://localhost:3000/api'
  ) {
    this.db = db;
    this.apiUrl = apiUrl;
  }

  /** Main sync orchestration (simplified placeholder) */
  async sync(): Promise<SyncResult> {
    const items = await this.db.all(
      'SELECT * FROM sync_queue WHERE retry_count < 5'
    );

    // TODO: batch & process properly
  //   const result: SyncResult = {
  //     total: items.length,
  //     success: items.length > 0,
  //     failed: items.length,
  //     conflicts: 0,
  //   };

  //   return result;
  // }
   let success =0;
  let failed = 0;

  for (const item of items) {
    try {
      // 📝 In future: call remote API depending on operation
      // e.g. axios.post(`${this.apiUrl}/tasks`, item.data_json)

      // ✅ Mark as synced locally
      await this.updateSyncStatus(item.task_id, 'synced');
      success++;
    } catch (err) {
      await this.handleSyncError(item, err as Error);
      failed++;
    }
  }

  return {
    total: items.length,
    success,
    failed,
    conflicts: 0
  };
}

  /** Add an operation to the sync queue */
  async addToSyncQueue(
    taskId: string,
    operation: 'create' | 'update' | 'delete',
    data: Partial<Task>
  ): Promise<void> {
    const id = randomUUID();
    const data_json = JSON.stringify(data);

    await this.db.run(
      `INSERT INTO sync_queue (id, task_id, operation, data_json) 
       VALUES (?, ?, ?, ?)`,
      [id, taskId, operation, data_json]
    );
  }

  /** Public: process a batch of sync items */
  public async processBatch(body: any): Promise<BatchSyncResponse> {
    // Normally: forward to server for batch sync
    return {
      items: body.items || [],
      processed_items: [],
    };
  }

  /** Public: sync status for router */
  public async getStatus(): Promise<{ pending: number; lastSync?: string }> {
    const row = await this.db.get(
      'SELECT COUNT(*) as count FROM sync_queue WHERE retry_count < 5'
    );

    return {
      pending: row?.count || 0,
      lastSync: new Date().toISOString(), // placeholder
    };
  }

  /** Conflict resolution: last-write-wins */
  private async resolveConflict(localTask: Task, serverTask: Task): Promise<Task> {
    const localUpdated = new Date(localTask.updated_at).getTime();
    const serverUpdated = new Date(serverTask.updated_at).getTime();

    return localUpdated >= serverUpdated ? localTask : serverTask;
  }

  /** Update sync status in DB */
  // private async updateSyncStatus(
  //   taskId: string,
  //   status: 'synced' | 'error',
  //   serverData?: Partial<Task>
  // ): Promise<void> {
  //   await this.db.run(
  //     `UPDATE tasks 
  //      SET sync_status = ?, 
  //          last_synced_at = CURRENT_TIMESTAMP, 
  //          server_id = COALESCE(?, server_id) 
  //      WHERE id = ?`,
  //     [status, serverData?.id || null, taskId]
  //   );

  //   if (status === 'synced') {
  //     await this.db.run(`DELETE FROM sync_queue WHERE task_id = ?`, [taskId]);
  //   }
  // }
private async updateSyncStatus(
  taskId: string,
  status: 'synced' | 'error',
  serverData?: Partial<Task>
): Promise<void> {
  await this.db.run(
    `UPDATE tasks 
     SET sync_status = ?, 
         last_synced_at = CURRENT_TIMESTAMP, 
         server_id = COALESCE(?, server_id) 
     WHERE id = ?`,
    [status, serverData?.id || null, taskId]
  );

  if (status === 'synced') {
    await this.db.run(`DELETE FROM sync_queue WHERE task_id = ?`, [taskId]);
  }
}

  /** Handle sync error */
  private async handleSyncError(item: SyncQueueItem, error: Error): Promise<void> {
    await this.db.run(
      `UPDATE sync_queue 
       SET retry_count = retry_count + 1, 
           error_message = ? 
       WHERE id = ?`,
      [error.message, item.id]
    );
  }

  /** Check if server is reachable */
  async checkConnectivity(): Promise<boolean> {
    try {
      await axios.get(`${this.apiUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
  
}

