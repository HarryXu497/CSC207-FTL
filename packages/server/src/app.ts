/**
 * Builds the Express app - but does NOT start listening.
 *
 * Keeping those two separate means the test can drive a real app without binding
 * a TCP port. Only index.ts calls `.listen()`.
 *
 * MIDDLEWARE ORDER MATTERS. Each `app.use()` adds a link to a chain that runs top
 * to bottom on every request.
 */
import cors from 'cors';
import express, { type Express } from 'express';
import type { CallRepository } from './CallRepository';
import { createRouter } from './routes';

export function createApp(repo: CallRepository, backend: 'memory' | 'firestore'): Express {
  const app = express();

  /* 1. Let the browser call us from a different origin. The Vite dev server also
        proxies /api to us, which avoids CORS entirely - this is here so curl and
        Postman work too. */
  app.use(cors());

  /* 2. Parse JSON request bodies into `req.body`.
        WITHOUT THIS LINE `req.body` IS UNDEFINED. It is the single most common
        first-time Express bug. The size limit stops someone POSTing a 2 GB body. */
  app.use(express.json({ limit: '100kb' }));

  /* 3. Log every request. Invaluable for knowing whether one even arrived. */
  app.use((req, _res, next) => {
    console.log(`[recall] ${req.method} ${req.originalUrl}`);
    next(); // hand off to the next link; forget this and the request HANGS
  });

  /* 4. The real routes, all under /api. */
  app.use('/api', createRouter(repo, backend));

  /* 5. LAST: anything thrown above lands here and becomes a JSON 500.
        Express recognises error middleware purely by it taking FOUR arguments -
        delete the unused `_next` and your 500s silently turn into hung requests. */
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[recall] unhandled error:', err);
      /* Log the real error for us; send the client something generic, because
         internal messages leak how the system is built. */
      res.status(500).json({ error: { message: 'Something went wrong on the server.' } });
    },
  );

  return app;
}
