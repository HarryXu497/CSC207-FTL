import type { Message } from 'src/entities';
import { SimulationConflictError } from 'src/errors';
import type { CallRepository, MessageRepositoryBuilder } from '../database';
import type { SimulationGenerator } from './SimulationGenerator';
import type { SimulationRepository, SimulationTarget } from './SimulationRepository';

/** Generates and saves replies using the selected branch's persisted conversation. */
export class StoredSimulationRepository implements SimulationRepository {
  // Adapter-level optimization: share duplicate provider calls within this instance.
  // The interactor validates the target; addMessageIfLastMatches still guards the
  // saved turn across server instances, independently of this in-flight cache.
  private readonly pendingReplies = new Map<string, Promise<Message>>();

  constructor(
    private readonly callRepo: CallRepository,
    private readonly messageRepoFactory: MessageRepositoryBuilder,
    private readonly generator: SimulationGenerator,
  ) {}

  simulateCustomerReply(target: SimulationTarget, expectedLastMessageId: string): Promise<Message> {
    const key = JSON.stringify([target.callId, target.branchId, expectedLastMessageId]);
    const pending = this.pendingReplies.get(key);
    if (pending) return pending;

    const reply = this.generateAndSave(target, expectedLastMessageId).finally(() => {
      this.pendingReplies.delete(key);
    });
    this.pendingReplies.set(key, reply);
    return reply;
  }

  private async generateAndSave(
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
