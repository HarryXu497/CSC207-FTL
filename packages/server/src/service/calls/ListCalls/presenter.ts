import type { Response } from 'express';
import type { WithError } from 'src/entities';
import type { ListCallsOutputBoundary, ListCallsOutputData } from './output';

export class ListCallsPresenter implements ListCallsOutputBoundary {
  constructor(private readonly res: Response<WithError<ListCallsOutputData>>) {}

  present(output: ListCallsOutputData): void {
    this.res.json(output);
  }
}
