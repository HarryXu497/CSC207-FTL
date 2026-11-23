import type { StreamMessagesOutputBoundary } from './output';

/**
 * The interface for the message streaming input boundry.
 * The controller depends on this interface to start streaming through a presenter.
 */
export interface StreamMessagesInputBoundary {
    /**
     * Subscribes to message updates and passes them to the presenter.
     *
     * @param presenter - Handles starting the stream and displaying message updates.
     * @returns A function that unsubscribes when the stream is closed 
     * since we are not interested in corresponding database changes when we 
     * are not streaming messages.
     */
    handle(presenter: StreamMessagesOutputBoundary): () => void;
}