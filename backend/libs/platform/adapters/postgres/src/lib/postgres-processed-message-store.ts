import type { Clock, IdGenerator } from '@platform/kernel';
import type {
  ProcessedMessage,
  ProcessedMessageStore,
} from '@platform/messaging';
import {
  type Database,
  type DatabaseResolver,
  PostgresIdempotencyStore,
} from '@platform/persistence';

/** Opciones de {@link PostgresProcessedMessageStore}. */
export interface PostgresProcessedMessageStoreOptions {
  /** La base del servicio o el resolver de shards: el claim vive con los efectos del handler. */
  readonly databases: Database | DatabaseResolver;
  readonly ids: IdGenerator;
  readonly clock?: Clock;
  /** Tabla. Por defecto `processed_messages` (migración `PlatformProcessedMessages`). */
  readonly table?: string;
}

/**
 * Adaptador Postgres del puerto `ProcessedMessageStore` de `@platform/messaging`.
 *
 * Reutiliza `PostgresIdempotencyStore`, así que tiene la misma semántica que
 * `InMemoryProcessedMessageStore`: claims con dueño (token y lease), `in-progress`
 * mientras otro handler corre, `complete` y `release` solo con el token vigente.
 * El dispatcher usa la llave `processedMessageKey(consumer, id)`. Dentro de
 * `runInContext` (una transacción abierta) `complete` se guarda junto a los efectos.
 */
export class PostgresProcessedMessageStore
  extends PostgresIdempotencyStore<ProcessedMessage>
  implements ProcessedMessageStore
{
  constructor(options: PostgresProcessedMessageStoreOptions) {
    super({
      databases: options.databases,
      ids: options.ids,
      ...(options.clock === undefined ? {} : { clock: options.clock }),
      table: options.table ?? 'processed_messages',
    });
  }
}
