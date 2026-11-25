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
  abstract record(entry: SagaEntry): Promise<void>;
  abstract find(sagaId: string): Promise<SagaEntry | undefined>;
}
