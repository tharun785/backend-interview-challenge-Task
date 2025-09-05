// import { v4 as uuidv4 } from 'uuid';
// import { Task } from '../types';
// import { Database } from '../db/database';

// export class TaskService {
//   constructor(private db: Database) {}

//   async createTask(taskData: Partial<Task>): Promise<Task> {
//     // TODO: Implement task creation
//     // 1. Generate UUID for the task
//     // 2. Set default values (completed: false, is_deleted: false)
//     // 3. Set sync_status to 'pending'
//     // 4. Insert into database
//     // 5. Add to sync queue
//     throw new Error('Not implemented');
//   }

//   async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
//     // TODO: Implement task update
//     // 1. Check if task exists
//     // 2. Update task in database
//     // 3. Update updated_at timestamp
//     // 4. Set sync_status to 'pending'
//     // 5. Add to sync queue
//     throw new Error('Not implemented');
//   }

//   async deleteTask(id: string): Promise<boolean> {
//     // TODO: Implement soft delete
//     // 1. Check if task exists
//     // 2. Set is_deleted to true
//     // 3. Update updated_at timestamp
//     // 4. Set sync_status to 'pending'
//     // 5. Add to sync queue
//     throw new Error('Not implemented');
//   }

//   async getTask(id: string): Promise<Task | null> {
//     // TODO: Implement get single task
//     // 1. Query database for task by id
//     // 2. Return null if not found or is_deleted is true
//     throw new Error('Not implemented');
//   }

//   async getAllTasks(): Promise<Task[]> {
//     // TODO: Implement get all non-deleted tasks
//     // 1. Query database for all tasks where is_deleted = false
//     // 2. Return array of tasks
//     throw new Error('Not implemented');
//   }

//   async getTasksNeedingSync(): Promise<Task[]> {
//     // TODO: Get all tasks with sync_status = 'pending' or 'error'
//     throw new Error('Not implemented');
//   }
// }









import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types';
import { Database } from '../db/database';

type UpsertableTask = Omit<Task,
  'server_id' | 'last_synced_at'
> & Partial<Pick<Task, 'server_id' | 'last_synced_at'>>;

export class TaskService {
  constructor(private db: Database) {}

  private nowDate(): Date {
    return new Date();
  }

  async createTask(taskData: Partial<Task>): Promise<Task> {
    // 1. Generate UUID for the task
    const id = taskData.id ?? uuidv4();
    const now = this.nowDate();

    // 2. Defaults
    const title = (taskData.title ?? '').trim();
    if (!title) throw new Error('title is required');

    const task: UpsertableTask = {
      id,
      title,
      description: taskData.description ?? '',
      completed: taskData.completed ?? false,
      created_at: now,
      updated_at: now,
      is_deleted: false,
      sync_status: 'pending',
      server_id: taskData.server_id ?? undefined,
      last_synced_at: undefined
    };

    // 4. Insert into database
    await this.db.run(
      `INSERT INTO tasks
        (id, title, description, completed, created_at, updated_at, is_deleted, sync_status, server_id, last_synced_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id, task.title, task.description, task.completed ? 1 : 0,
        task.created_at.toISOString(), task.updated_at.toISOString(), task.is_deleted ? 1 : 0,
        task.sync_status, task.server_id, task.last_synced_at
      ]
    );

    // 5. Add to sync queue
    await this.db.run(
      `INSERT INTO sync_queue
        (id, task_id, operation, data_json, retry_count, error, next_attempt_at, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
      [
        uuidv4(),
        id,
        'create',
        JSON.stringify(task),
        now.toISOString(),
        now.toISOString(),
        now.toISOString()
      ]
    );

    return (await this.getTask(id)) as Task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // 1. Check if task exists
    const existing = await this.getTaskRaw(id);
    if (!existing || existing.is_deleted) return null;

    // 2 & 3. Update task in database with new updated_at
    const now = this.nowDate();
    const merged: UpsertableTask = {
      ...existing,
      title: updates.title !== undefined ? updates.title : existing.title,
      description: updates.description !== undefined ? updates.description : existing.description,
      completed: updates.completed !== undefined ? !!updates.completed : !!existing.completed,
      is_deleted: existing.is_deleted,
      updated_at: now,
    };

    await this.db.run(
      `UPDATE tasks
         SET title = ?, description = ?, completed = ?, updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [merged.title, merged.description, merged.completed ? 1 : 0, merged.updated_at.toISOString(), id]
    );

    // 5. Add to sync queue
    await this.db.run(
      `INSERT INTO sync_queue
        (id, task_id, operation, data_json, retry_count, error, next_attempt_at, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
      [
        uuidv4(),
        id,
        'update',
        JSON.stringify(merged),
        now,
        now,
        now
      ]
    );

    return (await this.getTask(id)) as Task;
  }

  async deleteTask(id: string): Promise<boolean> {
    // 1. Check if task exists
    const existing = await this.getTaskRaw(id);
    if (!existing) return false;

    // 2,3,4. Soft delete and mark pending
    const now = this.nowDate();
    await this.db.run(
      `UPDATE tasks
         SET is_deleted = 1, updated_at = ?, sync_status = 'pending'
       WHERE id = ?`,
      [now.toISOString(), id]
    );

    // 5. Add to sync queue
    const payload = { ...existing, is_deleted: true, updated_at: now };
    await this.db.run(
      `INSERT INTO sync_queue
        (id, task_id, operation, data_json, retry_count, error, next_attempt_at, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, 0, NULL, ?, ?, ?)`,
      [
        uuidv4(),
        id,
        'delete',
        JSON.stringify(payload),
        now.toISOString(),
        now.toISOString(),
        now.toISOString()
      ]
    );

    return true;
  }

  // async getTask(id: string): Promise<Task | null> {
  //   // 1. Query database
  //   const row = await this.db.get(
  //     `SELECT id, title, description, completed, created_at, updated_at, is_deleted, sync_status, server_id, last_synced_at
  //        FROM tasks
  //        WHERE id = ?`,
  //     [id]
  //   );
  //   if (!row) return null;
  //   if (row.is_deleted) return null;
  //   return this.mapRowToTask(row);
  // }
async getTask(id: string): Promise<Task | null> {
  const sql = `
    SELECT 
      id, 
      title, 
      description, 
      completed, 
      created_at, 
      updated_at, 
      is_deleted, 
      sync_status, 
      server_id,
      last_synced_at   
    FROM tasks
    WHERE id = ?,
    
  `;
  return this.db.get(sql, [id]);
}
  private async getTaskRaw(id: string): Promise<Task | null> {
    const row = await this.db.get(
      `SELECT id, title, description, completed, created_at, updated_at, is_deleted, sync_status, server_id, last_synced_at
         FROM tasks
         WHERE id = ?`,
      [id]
    );
    return row ? this.mapRowToTask(row) : null;
  }

  async getAllTasks(): Promise<Task[]> {
    // const rows = await this.db.all(
    //   `SELECT id, title, description, completed, created_at, updated_at, is_deleted, sync_status, server_id, last_synced_at
    //      FROM tasks
    //      WHERE is_deleted = 0
    //      ORDER BY datetime(updated_at) DESC`
    // );
    // return rows.map((r: any) => this.mapRowToTask(r));
     const sql = `
    SELECT 
      id, 
      title, 
      description, 
      completed, 
      created_at, 
      updated_at, 
      is_deleted, 
      sync_status, 
      server_id,
      last_synced_at   
    FROM tasks
    WHERE is_deleted = 0
  `;
  return this.db.all(sql);
  }

  async getTasksNeedingSync(): Promise<Task[]> {
    const rows = await this.db.all(
      `SELECT id, title, description, completed, created_at, updated_at, is_deleted, sync_status, server_id, last_synced_at
         FROM tasks
         WHERE sync_status IN ('pending','error')`
    );
    return rows.map((r: any) => this.mapRowToTask(r));
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: !!row.completed,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      is_deleted: !!row.is_deleted,
      sync_status: row.sync_status,
      server_id: row.server_id ?? null,
      last_synced_at: row.last_synced_at ? new Date(row.last_synced_at) : undefined
    };
  }
}


