import type { Deadline } from '@platform/primitives';
import type { ShardAccess } from '../model/shard-access.enum.js';
import type { ShardKey } from '../model/shard-key.enum.js';

/** Entrada de `ShardRouter.resolve`. */
export interface ResolveRequest {
  /** UUIDv7 por defecto (ver `tenantIdPattern`). */
  readonly tenantId: string;
  readonly keyKind: ShardKey;
  /** Obligatoria salvo con `ShardKey.Tenant`. Como máximo `maxKeyLength` caracteres. */
  readonly keyValue?: string;
  readonly access: ShardAccess;
  /** Presupuesto de tiempo de la búsqueda. Al vencer, `resolve` rechaza con `DeadlineExceededError`. */
  readonly deadline?: Deadline;
  /** Cancela la búsqueda. `resolve` rechaza con el `reason` de la señal. */
  readonly signal?: AbortSignal;
}
