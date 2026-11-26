export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class LlmOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmOutputError';
  }
}

export class SimulationConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationConflictError';
  }
}

export class InvalidBranchPointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBranchPointError';
  }
}
