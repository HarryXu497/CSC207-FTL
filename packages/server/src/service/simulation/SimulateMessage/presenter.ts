import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { SimulateMessageOutputBoundary, SimulateMessageOutputData } from './output';

export class SimulateMessagePresenter implements SimulateMessageOutputBoundary {
  constructor(private readonly res: Response<WithError<SimulateMessageOutputData>>) {}

  present(output: SimulateMessageOutputData): void {
    this.res.status(201).json(output);
  }

  presentBadRequest(message: string): void {
    this.res.status(400).json({ error: { message } });
  }

  presentNotFound(message: string): void {
    this.res.status(404).json({ error: { message } });
  }

  presentConflict(message: string): void {
    this.res.status(409).json({ error: { message } });
  }

  presentServiceUnavailable(): void {
    this.res.status(503).json({ error: { message: 'Simulation is not available.' } });
  }
}
