import type { ClaimRequest, ClaimResult } from '@platform/kernel';
import type {
  ProcessedMessage,
  ProcessedMessageStore,
} from '@platform/messaging';
import type { ClaimTable } from './claim-table.js';

/**
 * Adaptador TypeORM del puerto `ProcessedMessageStore` de `@platform/messaging` sobre `processed_messages`. Tiene la
 * misma semántica que `InMemoryProcessedMessageStore`: claims con dueño (token y lease), `in-progress` mientras otro
 * handler corre, `complete` y `release` solo con el token vigente. Dentro de una transacción abierta `complete` se
 * guarda junto a los efectos. La lógica vive en `ClaimTable`, que se inyecta ya armada con `ProcessedMessageEntity`.
 */
export class TypeOrmProcessedMessageStore implements ProcessedMessageStore {
  constructor(private readonly table: ClaimTable<ProcessedMessage>) {}

  claim(
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<ProcessedMessage>> {
    return this.table.claim(key, request);
  }

  complete(
    key: string,
    claimToken: string,
    result: ProcessedMessage,
  ): Promise<void> {
    return this.table.complete(key, claimToken, result);
  }

  release(key: string, claimToken: string): Promise<void> {
    return this.table.release(key, claimToken);
  }

  purgeCompleted(before: Date): Promise<number> {
    return this.table.purgeCompleted(before);
  }
}
