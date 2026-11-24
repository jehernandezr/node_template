import { SagaDirectory, type SagaEntry } from '../../domain/saga-directory.js';

/** Directorio de sagas en memoria: anotar dos veces la misma saga no cambia nada, como en el catálogo. */
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
