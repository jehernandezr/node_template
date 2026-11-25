import { SagaDirectory, type SagaEntry } from '../../domain/saga-directory.js';

/** In-memory saga directory: registering the same saga twice changes nothing, as in the catalog. */
export class InMemorySagaDirectory extends SagaDirectory {
  private readonly entries = new Map<string, SagaEntry>();

  async record(entry: SagaEntry): Promise<void> {
    if (!this.entries.has(entry.sagaId)) {
      this.entries.set(entry.sagaId, entry);
    }
  }

  async find(sagaId: string): Promise<SagaEntry | undefined> {
    return this.entries.get(sagaId);
  }
}
