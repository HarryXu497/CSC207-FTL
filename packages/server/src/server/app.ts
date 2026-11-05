/**
 * Builds the Express app
 */
import cors from 'cors';
import express, { type Express } from 'express';
import type { CallRepository } from 'src/repository';
import { JSON_BODY_LIMIT } from './limits';
import { createRouter, type ServerServices } from './routes';
import { describeClientError } from './utils';

export function createApp(
  repo: CallRepository,
  backend: 'memory' | 'firestore',
  services: ServerServices = {},
): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  // Logging
  app.use((req, _res, next) => {
    console.log(`[recall] ${req.method} ${req.originalUrl}`);
    next();
  });

  // Routes
  app.use('/api', createRouter(repo, backend, services));

  // Errors
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      // Mistakes by the caller (oversized or malformed body) are 4xx, not server errors.
      const clientError = describeClientError(err);
      if (clientError) {
        res.status(clientError.status).json({ error: { message: clientError.message } });
        return;
      }

      console.error('[recall] unhandled error:', err);
      res.status(500).json({ error: { message: 'Something went wrong on the server.' } });
    },
  );

  return app;
}
