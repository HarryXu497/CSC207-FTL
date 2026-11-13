import type { GetCallSentimentResponse, ServerResponse } from '@recall/shared';
import { Router, type Response } from 'express';
import { NotFoundError } from 'src/errors';
import type { AnalyseMessages, CallRepository, MessageRepositoryBuilder } from 'src/repository';
import { SentimentService } from 'src/service';

export function createSentimentRouter(
  callRepo: CallRepository,
  messageRepoFactory: MessageRepositoryBuilder,
  analyseMessages: AnalyseMessages | null,
): Router {
  const router = Router();

  if (!analyseMessages) {
    router.use('/calls/:callId/sentiment', (_req, res: Response<ServerResponse<never>>) => {
      res.status(503).json({
        error: {
          message: 'ERROR: Sentiment analysis is not available.',
        },
      });
    });
    return router;
  }

  const getCallSentiment = new SentimentService.GetCallSentiment(
    callRepo,
    messageRepoFactory,
    analyseMessages,
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
