// import { Router, Request, Response } from 'express';
// import { SyncService } from '../services/syncService';
// import { TaskService } from '../services/taskService';
// import { Database } from '../db/database';

// export function createSyncRouter(db: Database): Router {
//   const router = Router();
//   const taskService = new TaskService(db);
//   const syncService = new SyncService(db, taskService);

//   // Trigger manual sync
//   router.post('/sync', async (req: Request, res: Response) => {
//     // TODO: Implement sync endpoint
//     // 1. Check connectivity first
//     // 2. Call syncService.sync()
//     // 3. Return sync result
//     res.status(501).json({ error: 'Not implemented' });
//   });

//   // Check sync status
//   router.get('/status', async (req: Request, res: Response) => {
//     // TODO: Implement sync status endpoint
//     // 1. Get pending sync count
//     // 2. Get last sync timestamp
//     // 3. Check connectivity
//     // 4. Return status summary
//     res.status(501).json({ error: 'Not implemented' });
//   });

//   // Batch sync endpoint (for server-side)
//   router.post('/batch', async (req: Request, res: Response) => {
//     // TODO: Implement batch sync endpoint
//     // This would be implemented on the server side
//     // to handle batch sync requests from clients
//     res.status(501).json({ error: 'Not implemented' });
//   });

//   // Health check endpoint
//   router.get('/health', async (req: Request, res: Response) => {
//     res.json({ status: 'ok', timestamp: new Date() });
//   });

//   return router;
// }






import { Router } from 'express';
import { Database } from '../db/database';
import { SyncService } from '../services/syncService';
import { validateBatchSync } from '../validators/syncValidators';

export function createSyncRouter(db: Database): Router {
  const router = Router();
  const syncService = new SyncService(db);

  // ✅ Health check: simple GET, no body parsing
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // ✅ Sync status
  router.get('/status', async (_req, res) => {
    try {
      const status = await syncService.getStatus();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to get status' });
    }
  });

  // ✅ Batch sync
  router.post('/batch', async (req, res) => {
    if (!req.body || !req.body.items) {
      return res.status(400).json({ error: 'Batch request requires items[]' });
    }

    const errors = validateBatchSync(req.body);
    if (errors.length) return res.status(400).json({ errors });

    try {
      const result = await syncService.processBatch(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Batch processing failed' });
    }
  });

  return router;
}
