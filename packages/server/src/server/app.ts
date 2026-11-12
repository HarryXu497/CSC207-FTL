/**
 * Builds the Express app
 */
import cors from 'cors';
import express, { type Express } from 'express';
import type { AnalyseMessages, BranchRepository, CallRepository } from 'src/repository';
import type { MessageRepoFactory } from './routers';
import { createRouter } from './routes';

export function createApp(
  callRepo: CallRepository,
  branchRepo: BranchRepository,
  messageRepoFactory: MessageRepoFactory,
  backend: 'memory' | 'firestore',
  analyseMessages: AnalyseMessages | null,
): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  // Logging
  app.use((req, _res, next) => {
    console.log(`[recall] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Routes
  app.use('/api', createRouter(callRepo, branchRepo, messageRepoFactory, backend, analyseMessages));

  // Errors
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[recall] unhandled error:', err);
      res.status(500).json({ error: { message: 'Something went wrong on the server.' } });
    },
  );

  return app;
}
