import type { Call } from './calls';

export interface Branch extends Call {
  parentId: string;
  branchIndex: number;
}
