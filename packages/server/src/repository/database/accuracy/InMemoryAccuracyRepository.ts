import type { Accuracy } from 'src/entities';
import type { AccuracyRepository } from './AccuracyRepository';

export class InMemoryAccuracyRepository implements AccuracyRepository {
  private readonly accuracies = new Map<string, Accuracy>();

  /**
   * Gets the accuracy for a specific call.
   * @param callId - The id of the call to get accuracy for
   * @returns the Accuracy object for the given call, or null if it doesn't exist
   */
  async getAccuracyForCall(callId: string): Promise<Accuracy | null> {
    return this.accuracies.get(callId) ?? null;
  }

  /**
   * Sets the accuracy for a specific call.
   * @param callId - The id of the call to set accuracy for
   * @param accuracy - The accuracy object to set
   */
  async setAccuracy(callId: string, accuracy: Accuracy): Promise<void> {
    this.accuracies.set(callId, accuracy);
  }

  /**
   * Deletes the accuracy for a specific call.
   * @param callId - The id of the call to delete accuracy for
   */
  async deleteAccuracyForCall(callId: string): Promise<void> {
    this.accuracies.delete(callId);
  }
}
