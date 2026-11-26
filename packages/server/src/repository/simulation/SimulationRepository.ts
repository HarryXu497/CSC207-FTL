import type { Message } from 'src/entities';

/** Identifies a practice branch and the original call it belongs to. */
export interface SimulationTarget {
  callId: string;
  branchId: string;
}

export interface SimulationRepository {
  /**
   * Generates a customer reply from saved history and company context, then saves it.
   * Returns the persisted customer message with its assigned ID and timestamp.
   *
   * @param target - The branch to continue and its original call.
   * @param expectedLastMessageId - The saved agent message being answered.
   * A stale expected ID must not result in a saved reply.
   */
  simulateCustomerReply(target: SimulationTarget, expectedLastMessageId: string): Promise<Message>;
}
