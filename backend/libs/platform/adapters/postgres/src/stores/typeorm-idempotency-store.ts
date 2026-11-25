import type {
  ClaimRequest,
  ClaimResult,
  IdempotencyStore,
} from '@platform/kernel';
import type { ClaimTable } from './claim-table.js';

/**
 * Adaptador TypeORM del puerto `IdempotencyStore` del kernel sobre `idempotency_keys`, con los mismos tres estados y
 * el mismo fencing que el adaptador en memoria. La lógica vive en `ClaimTable`, que se inyecta ya armada con
 * `IdempotencyKeyEntity`.
 */
export class TypeOrmIdempotencyStore<
  R = unknown,
> implements IdempotencyStore<R> {
  constructor(private readonly table: ClaimTable<R>) {}

  claim(key: string, request: ClaimRequest): Promise<ClaimResult<R>> {
    return this.table.claim(key, request);
  }

  complete(key: string, claimToken: string, result: R): Promise<void> {
    return this.table.complete(key, claimToken, result);
  }

  release(key: string, claimToken: string): Promise<void> {
    return this.table.release(key, claimToken);
  }

  /** Extiende el lease de un claim en curso del token; `false` si ya terminó o lo tomó otro intento. */
  renew(
    key: string,
    claimToken: string,
    leaseUntilMs: number,
  ): Promise<boolean> {
    return this.table.renew(key, claimToken, new Date(leaseUntilMs));
  }

  /** Borra resultados completados antes de `before`. Para el job de retención. Devuelve cuántos borró. */
  purgeCompleted(before: Date): Promise<number> {
    return this.table.purgeCompleted(before);
  }
}
