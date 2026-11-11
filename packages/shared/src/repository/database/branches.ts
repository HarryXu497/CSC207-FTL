import type { Call } from '@recall/shared';

export interface Branch extends Call {
  parentId: string;
  branchIndex: number;
}
