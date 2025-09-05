// import { Router, Request, Response } from 'express';
// import { TaskService } from '../services/taskService';
// import { SyncService } from '../services/syncService';
// import { Database } from '../db/database';

// export function createTaskRouter(db: Database): Router {
//   const router = Router();
//   const taskService = new TaskService(db);
//   const syncService = new SyncService(db, taskService);

//   // Get all tasks
//   router.get('/', async (req: Request, res: Response) => {
//     try {
//       const tasks = await taskService.getAllTasks();
//       res.json(tasks);
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to fetch tasks' });
//     }
//   });

//   // Get single task
//   router.get('/:id', async (req: Request, res: Response) => {
//     try {
//       const task = await taskService.getTask(req.params.id);
//       if (!task) {
//         return res.status(404).json({ error: 'Task not found' });
//       }
//       res.json(task);
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to fetch task' });
//     }
//   });

//   // Create task
//   router.post('/', async (req: Request, res: Response) => {
//     // TODO: Implement task creation endpoint
//     // 1. Validate request body
//     // 2. Call taskService.createTask()
//     // 3. Return created task
//     res.status(501).json({ error: 'Not implemented' });
//   });

//   // Update task
//   router.put('/:id', async (req: Request, res: Response) => {
//     // TODO: Implement task update endpoint
//     // 1. Validate request body
//     // 2. Call taskService.updateTask()
//     // 3. Handle not found case
//     // 4. Return updated task
//     res.status(501).json({ error: 'Not implemented' });
//   });

//   // Delete task
//   router.delete('/:id', async (req: Request, res: Response) => {
//     // TODO: Implement task deletion endpoint
//     // 1. Call taskService.deleteTask()
//     // 2. Handle not found case
//     // 3. Return success response
//     res.status(501).json({ error: 'Not implemented' });
//   });

//   return router;
// }







import { Router, Request, Response } from 'express';
import { Database } from '../db/database';
import { TaskService } from '../services/taskService';
import { validateCreate, validateUpdate } from '../validators/taskValidators';

export function createTaskRouter(db: Database): Router {
  const router = Router();
  const taskService = new TaskService(db);

  // Get all tasks
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const tasks = await taskService.getAllTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get single task
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const task = await taskService.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.json(task);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Create task
  router.post('/', async (req: Request, res: Response) => {
    try {
      const errors = validateCreate(req.body);
      if (errors.length) return res.status(400).json({ errors });

      const created = await taskService.createTask({
        title: String(req.body.title).trim(),
        description: req.body.description ?? '',
        completed: !!req.body.completed,
      });

      return res.status(201).json(created);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to create task' });
    }
  });

  // Update task
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const errors = validateUpdate(req.body);
      if (errors.length) return res.status(400).json({ errors });

      const updated = await taskService.updateTask(req.params.id, {
        title: req.body.title,
        description: req.body.description,
        completed: req.body.completed,
      });

      if (!updated) return res.status(404).json({ error: 'Task not found' });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to update task' });
    }
  });

  // Delete task (soft)
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const ok = await taskService.deleteTask(req.params.id);
      if (!ok) {
        return res.status(404).json({ error: 'Task not found' });
      }
      return res.status(204).send();
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to delete task' });
    }
  });

  return router;
}



