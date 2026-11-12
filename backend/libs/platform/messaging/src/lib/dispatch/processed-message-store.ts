/**
 * Port for idempotency. Keys are `(consumer, envelope.id)`, so the same message can be
 * handled once by each consumer.
 *
 * Adapters must make `claim` atomic (a unique insert, or a conditional write). A real
 * store should claim inside the handler's transaction, using the dispatcher's
 * `runInContext`, so that a rollback also releases the claim.
 */
export interface ProcessedMessageStore {
  /** Claims `(consumer, id)`. Returns false when it was already claimed. */
  claim(consumer: string, id: string): Promise<boolean>;
  /** Releases a claim after a failed handler, so a later delivery can run. */
  release(consumer: string, id: string): Promise<void>;
}

/** In-memory adapter, suitable for tests and local runs. */
export class InMemoryProcessedMessageStore implements ProcessedMessageStore {
  private readonly claims = new Set<string>();

  claim(consumer: string, id: string): Promise<boolean> {
    const key = JSON.stringify([consumer, id]);
    if (this.claims.has(key)) return Promise.resolve(false);
    this.claims.add(key);
    return Promise.resolve(true);
  }

  release(consumer: string, id: string): Promise<void> {
    this.claims.delete(JSON.stringify([consumer, id]));
    return Promise.resolve();
  }
}
