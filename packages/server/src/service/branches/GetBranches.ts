import type { Branch } from '@recall/shared';
import type { BranchRepository } from 'src/repository';

export class GetBranches {
  constructor(private readonly branchRepository: BranchRepository) {}

  async handle(callId: string): Promise<Branch[]> {
    return await this.branchRepository.getAllBranchesOfCall(callId);
  }
}
