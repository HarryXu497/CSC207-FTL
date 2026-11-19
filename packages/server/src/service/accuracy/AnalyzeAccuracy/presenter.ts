import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type {
  AnalyzeAccuracyOutputBoundary,
  AnalyzeAccuracyOutputData,
  ValidationIssue,
} from './output';

export class AnalyzeAccuracyPresenter implements AnalyzeAccuracyOutputBoundary {
  constructor(private readonly res: Response<WithError<AnalyzeAccuracyOutputData>>) {}

  present(output: AnalyzeAccuracyOutputData): void {
    this.res.json(output);
  }

  presentBadRequest(message: string, details?: ValidationIssue[]): void {
    this.res.status(400).json({
      error: {
        message,
        details,
      },
    });
  }

  presentServiceUnavailable(): void {
    this.res.status(503).json({
      error: {
        message: 'Accuracy analysis is not configured on this server.',
      },
    });
  }

  presentModelFailure(): void {
    this.res.status(502).json({
      error: {
        message: 'The language model returned an unusable reply.',
      },
    });
  }
}
