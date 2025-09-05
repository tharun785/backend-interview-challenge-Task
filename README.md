# Task Sync API – Offline-first Backend

Backend API for a personal productivity app used in intermittent connectivity (trains, remote areas in India). Supports offline CRUD with a durable sync queue and batch reconciliation.

## Highlights
- REST endpoints for tasks (soft delete).
- Offline-first with a local SQLite store.
- Durable `sync_queue` with retries (max = `SYNC_MAX_RETRIES`, default 3).
- **Batch sync** (`SYNC_BATCH_SIZE`, default 50).
- **Last-write-wins** conflict resolution (by `updated_at`).
- Exponential backoff before reattempts.
- Sync status + health check endpoints.
- Clean separation: `TaskService` (CRUD) vs `SyncService` (sync orchestration).

## API
### Tasks
- `GET /api/tasks` – list non-deleted tasks.
- `GET /api/tasks/:id` – fetch a task.
- `POST /api/tasks` – create task.
- `PUT /api/tasks/:id` – update task.
- `DELETE /api/tasks/:id` – soft delete (204 on success).

### Sync
- `POST /api/sync` – trigger manual sync (runs batch orchestration).
- `GET /api/status` – pending queue count, last sync ts, connectivity.
- `POST /api/sync/batch` – **server-side** batch endpoint shape (included here as a reference/mock). In production, host this on your authoritative backend.

### Request Validation
Basic in-route validation for create/update; consider adding a global validation middleware (e.g., `zod` or `joi`) for bonus points.

## Environment












# Backend Interview Challenge - Task Sync API

This is a backend developer interview challenge focused on building a sync-enabled task management API. The challenge evaluates understanding of REST APIs, data synchronization, offline-first architecture, and conflict resolution.

## 📚 Documentation Overview

Please read these documents in order:

1. **[📋 Submission Instructions](./docs/SUBMISSION_INSTRUCTIONS.md)** - How to submit your solution (MUST READ)
2. **[📝 Requirements](./docs/REQUIREMENTS.md)** - Detailed challenge requirements and implementation tasks
3. **[🔌 API Specification](./docs/API_SPEC.md)** - Complete API documentation with examples
4. **[🤖 AI Usage Guidelines](./docs/AI_GUIDELINES.md)** - Guidelines for using AI tools during the challenge

**⚠️ Important**: DO NOT create pull requests against this repository. All submissions must be through private forks.

## Challenge Overview

Candidates are expected to implement a backend API that:
- Manages tasks (CRUD operations)
- Supports offline functionality with a sync queue
- Handles conflict resolution when syncing
- Provides robust error handling

## Project Structure

```
backend-interview-challenge/
├── src/
│   ├── db/             # Database setup and configuration
│   ├── models/         # Data models (if needed)
│   ├── services/       # Business logic (TO BE IMPLEMENTED)
│   ├── routes/         # API endpoints (TO BE IMPLEMENTED)
│   ├── middleware/     # Express middleware
│   ├── types/          # TypeScript interfaces
│   └── server.ts       # Express server setup
├── tests/              # Test files
├── docs/               # Documentation
└── package.json        # Dependencies and scripts
```

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run start` - Start production server
- `npm test` - Run tests
- `npm run test:ui` - Run tests with UI
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types

## Your Task

### Key Implementation Files

You'll need to implement the following services and routes:

- `src/services/taskService.ts` - Task CRUD operations
- `src/services/syncService.ts` - Sync logic and conflict resolution  
- `src/routes/tasks.ts` - REST API endpoints
- `src/routes/sync.ts` - Sync-related endpoints

### Before Submission

Ensure all of these pass:
```bash
npm test          # All tests must pass
npm run lint      # No linting errors
npm run typecheck # No TypeScript errors
```

### Time Expectation

This challenge is designed to take 2-3 hours to complete.

## License

This project is for interview purposes only.























