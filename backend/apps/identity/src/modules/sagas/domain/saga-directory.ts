import type { IdentitySaga } from '@contracts/identity';

/** Where an identity saga lives and who requested it. */
export interface SagaEntry {
  readonly sagaId: string;
  readonly saga: IdentitySaga;
  /** Tenant in whose shard the saga's log lives. */
  readonly tenantId: string;
  readonly requestedBy: string;
}

/** Saga directory in the catalog: finds a saga's shard by its id without walking all of them. */
export abstract class SagaDirectory {
  /**
   * Records which user requested a saga.
   * @param entry Saga id, type and requester.
   */
  abstract record(entry: SagaEntry): Promise<void>;
  /**
   * Reads the entry of a saga.
   * @param sagaId Saga to read.
   * @returns The entry, or `undefined`.
   */
  abstract find(sagaId: string): Promise<SagaEntry | undefined>;
}
