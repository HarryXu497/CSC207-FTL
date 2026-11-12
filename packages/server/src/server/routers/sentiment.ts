import type {
  GetCallSentimentResponse,
  ServerResponse,
} from '@recall/shared';
import { Router, type Response } from 'express';
import { NotFoundError } from 'src/errors';
import type { CallRepository } from 'src/repository';
import type { AnalyseMessages } from 'src/repository/sentiment/AnalyseMessages';
import { GetCallSentiment } from 'src/service/sentiment/GetCallSentiment';


export interface SentimentDeps {
  messageRepoFactory: ConstructorParameters<typeof GetCallSentiment>[1];
  analyseMessages: AnalyseMessages;
}


export function createSentimentRouter(
  callRepo: CallRepository,
  deps: SentimentDeps | undefined,
): Router {
  const router = Router();

  if (!deps) {
    router.use(
      '/calls/:callId/sentiment',
      (_req, res: Response<ServerResponse<never>>) => {
        res.status(503).json({
          error: {
            message: 'ERROR: Sentiment analysis is not available.',
          },
        });
      },
    );
    return router;
  }

  const getCallSentiment = new GetCallSentiment(
    callRepo,
    deps.messageRepoFactory,
    deps.analyseMessages,
  );

  router.get(
    '/calls/:callId/sentiment',
    async (req, res: Response<ServerResponse<GetCallSentimentResponse>>) => {
      const callId = req.params.callId;

      try {
        const sentiments = await getCallSentiment.handle(callId);
        res.json({ sentiments });
      } catch (e) {
        if (e instanceof NotFoundError) {
          res.status(404).json({ error: { message: e.message } });
        } else {
          throw e;
        }
      }
    },
  );

  return router;
}