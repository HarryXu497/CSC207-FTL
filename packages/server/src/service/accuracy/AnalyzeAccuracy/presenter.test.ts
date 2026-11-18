import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AnalyzeAccuracyPresenter } from './presenter';

function fakeResponse() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function presenterFor(res: ReturnType<typeof fakeResponse>) {
  return new AnalyzeAccuracyPresenter(res as unknown as Response);
}

describe('AnalyzeAccuracyPresenter', () => {
  it('answers 200 with the accuracy result', () => {
    const res = fakeResponse();
    const accuracy = { score: 100 } as never;
    presenterFor(res).present({ accuracy });

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ accuracy });
  });

  it('answers 400 with the message and details', () => {
    const res = fakeResponse();
    presenterFor(res).presentBadRequest('bad', [{ field: 'messages' }]);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'bad', details: [{ field: 'messages' }] },
    });
  });

  it('answers 502 when the model output was unusable', () => {
    const res = fakeResponse();
    presenterFor(res).presentBadGateway('unusable');
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('answers 503 when accuracy analysis is not configured', () => {
    const res = fakeResponse();
    presenterFor(res).presentServiceUnavailable();
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
