import type { IdentitySaga } from '@contracts/identity';

/** Dónde vive una saga de identity y quién la pidió. */
export interface SagaEntry {
  readonly sagaId: string;
  readonly saga: IdentitySaga;
  /** Tenant en cuyo shard vive la bitácora de la saga. */
  readonly tenantId: string;
  readonly requestedBy: string;
}

/** Directorio de sagas en el catálogo: encuentra el shard de una saga por su id sin recorrerlos todos. */
export abstract class SagaDirectory {
  abstract record(entry: SagaEntry): Promise<void>;
  abstract find(sagaId: string): Promise<SagaEntry | undefined>;
}
