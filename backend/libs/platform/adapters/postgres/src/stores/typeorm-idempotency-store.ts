import type {
  ClaimRequest,
  ClaimResult,
  IdempotencyStore,
} from '@platform/kernel';
import type { ClaimTable } from './claim-table.js';

/**
 * TypeORM adapter of the kernel `IdempotencyStore` port on `idempotency_keys`, with the same three states and
 * the same fencing as the in-memory adapter. The logic lives in `ClaimTable`, which is injected already built with
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

  /** Extends the lease of an in-progress claim of the token; `false` if it already finished or another attempt took it. */
  renew(
    key: string,
    claimToken: string,
    leaseUntilMs: number,
  ): Promise<boolean> {
    return this.table.renew(key, claimToken, new Date(leaseUntilMs));
  }

  /** Deletes results completed before `before`. For the retention job. Returns how many it deleted. */
  purgeCompleted(before: Date): Promise<number> {
    return this.table.purgeCompleted(before);
  }
}
