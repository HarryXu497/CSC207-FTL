import type { Message } from 'src/entities';
import { SimulationConflictError } from 'src/errors';
import type { CallRepository, MessageRepositoryBuilder } from '../database';
import type { SimulationGenerator } from './SimulationGenerator';
import type { SimulationRepository, SimulationTarget } from './SimulationRepository';

/** Generates and saves replies using the selected branch's persisted conversation. */
export class StoredSimulationRepository implements SimulationRepository {
  constructor(
    private readonly callRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly generator: SimulationGenerator,
  ) {}

  async simulateCustomerReply(
    { callId, branchId }: SimulationTarget,
    expectedLastMessageId: string,
  ): Promise<Message> {
    const scenario = await this.callRepo.getCall(callId);
    const messages = this.messageRepoFactory('branches', branchId);
    const history = await messages.getAllMessages();
    const latest = history.at(-1);

    if (!latest || latest.id !== expectedLastMessageId || latest.role !== 'agent') {
      throw new SimulationConflictError('The branch must end with the expected agent message.');
    }

    const content = await this.generator.generate({ scenario, history });
    const reply: Omit<Message, 'id'> = {
      role: 'customer',
      content,
      // Keep the reply after its agent turn, even if that turn has a future timestamp.
      createdAt: new Date(Math.max(Date.now(), Date.parse(latest.createdAt) + 1)).toISOString(),
    };
    const id = await messages.addMessageIfLastMatches(reply, expectedLastMessageId);

    if (id === null) {
      throw new SimulationConflictError('The conversation changed while generating the reply.');
    }

    return { id, ...reply };
  }
}
