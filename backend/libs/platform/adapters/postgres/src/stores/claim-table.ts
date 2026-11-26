import {
  ClaimState,
  type ClaimRequest,
  type ClaimResult,
  type Clock,
  type IdGenerator,
} from '@platform/kernel';
import {
  ClaimRules,
  DeadlineExceededError,
  StaleClaimError,
} from '@platform/primitives';
import {
  ManagerIntent,
  PersistenceError,
  PersistenceErrorCode,
} from '@platform/persistence';
import type {
  EntityManager,
  EntityTarget,
  QueryDeepPartialEntity,
} from 'typeorm';
import type { ClaimRecordEntity } from '../entities/claim-record.entity.js';
import type { ClaimRecordManagers } from '../model/claim-record-managers.js';
import type { ClaimTableOptions } from '../model/claim-table-options.js';

/** Row returned by the `INSERT ... ON CONFLICT` of `claim`. Raw SQL returns the column names as they are. */
interface ClaimedRow {
  readonly claim_token: string | null;
  readonly fingerprint: string;
  readonly attempt: number | string;
}

/**
 * Logic of a three-phase claim table with the same fencing as `InMemoryIdempotencyStore`. It is parameterized
 * with the entity (`IdempotencyKeyEntity` or `ProcessedMessageEntity`) and the result type `R`; the stores
 * use it by composition.
 */
export class ClaimTable<R> {
  private readonly serialize: (result: R) => unknown;
  private readonly deserialize: (stored: unknown) => R;
  private readonly tenantColumn: boolean;

  constructor(
    private readonly entity: EntityTarget<ClaimRecordEntity>,
    private readonly managers: ClaimRecordManagers,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    options: ClaimTableOptions<R> = {},
  ) {
    this.serialize = options.serialize ?? ((result: R): unknown => result);
    this.deserialize =
      options.deserialize ?? ((stored: unknown): R => stored as R);
    this.tenantColumn = options.tenantColumn ?? false;
  }

  /**
   * Claims a key: acquires it, finds its stored result or sees it in progress.
   * @param key Idempotency key.
   * @param request Fingerprint, deadline and lease.
   * @returns The claim result.
   */
  async claim(key: string, request: ClaimRequest): Promise<ClaimResult<R>> {
    ClaimRules.assertInput(key, request.fingerprint);
    return this.managers.run(ManagerIntent.Write, (manager) =>
      this.claimIn(manager, key, request),
    );
  }

  /**
   * Stores the result of a claim that still belongs to the token.
   * TypeORM types the `jsonb` column as a partial of `unknown` and does not accept `null` there; the `null` is the SQL value.
   * @param key Idempotency key.
   * @param claimToken Token of the claim.
   * @param result Result to store.
   */
  async complete(key: string, claimToken: string, result: R): Promise<void> {
    const affected = await this.managers.run(
      ManagerIntent.Write,
      async (manager) => {
        const outcome = await manager
          .createQueryBuilder()
          .update(this.entity)
          .set({
            state: ClaimState.Completed,
            result: (this.serialize(result) ?? null) as QueryDeepPartialEntity<
              ClaimRecordEntity['result']
            >,
            claimToken: null,
            leaseUntil: null,
            updatedAt: this.clock.now(),
          })
          .where({ key, claimToken, state: ClaimState.InProgress })
          .execute();
        return outcome.affected ?? 0;
      },
    );
    if (affected === 0) {
      throw new StaleClaimError('complete');
    }
  }

  /**
   * Releases a claim of the token so the key can be claimed again.
   * @param key Idempotency key.
   * @param claimToken Token of the claim.
   */
  async release(key: string, claimToken: string): Promise<void> {
    const affected = await this.managers.run(
      ManagerIntent.Write,
      async (manager) => {
        const outcome = await manager
          .createQueryBuilder()
          .delete()
          .from(this.entity)
          .where({ key, claimToken, state: ClaimState.InProgress })
          .execute();
        return outcome.affected ?? 0;
      },
    );
    if (affected === 0) {
      throw new StaleClaimError('release');
    }
  }

  /**
   * Extends to `leaseUntil` the lease of an in-progress claim that still belongs to `claimToken`, never shortening it.
   * Returns `false` if the claim already finished or another attempt took it.
   * @param key Idempotency key.
   * @param claimToken Token of the claim.
   * @param leaseUntil New lease end.
   * @returns Whether it was renewed.
   */
  async renew(
    key: string,
    claimToken: string,
    leaseUntil: Date,
  ): Promise<boolean> {
    const affected = await this.managers.run(
      ManagerIntent.Write,
      async (manager) => {
        const outcome = await manager
          .createQueryBuilder()
          .update(this.entity)
          .set({ leaseUntil, updatedAt: this.clock.now() })
          .where({ key, claimToken, state: ClaimState.InProgress })
          .andWhere('lease_until < :leaseUntil', { leaseUntil })
          .execute();
        return outcome.affected ?? 0;
      },
    );
    if (affected > 0) {
      return true;
    }
    const owned = await this.managers.run(ManagerIntent.Write, (manager) =>
      manager.existsBy(this.entity, {
        key,
        claimToken,
        state: ClaimState.InProgress,
      }),
    );
    return owned;
  }

  /**
   * Deletes results completed before `before`; visits all shards if none is pinned. Returns how many it deleted.
   * @param before Instant the completion must predate.
   * @returns How many were deleted.
   */
  purgeCompleted(before: Date): Promise<number> {
    return this.managers.sweep(async (manager) => {
      const outcome = await manager
        .createQueryBuilder()
        .delete()
        .from(this.entity)
        .where('state = :state AND updated_at < :before', {
          state: ClaimState.Completed,
          before,
        })
        .execute();
      return outcome.affected ?? 0;
    });
  }

  /**
   * Runs entirely inside the manager it receives: the `SELECT` of the live row and the `INSERT` must see the same state
   * and, with the `Write`, end up in the same transaction.
   * With no time to run the operation, only an already stored result is useful.
   * TypeORM's `orUpdate` does not accept the conflict WHERE, and Postgres returns no row if that WHERE does not hold. Our own token tells whether the key was taken.
   * The row was released or expired between the two statements: the caller retries.
   */
  private async claimIn(
    manager: EntityManager,
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<R>> {
    const now = this.clock.now();
    if (request.deadline.atMs <= now.getTime()) {
      const live = await this.readLive(manager, key, now.getTime());
      if (live !== undefined) {
        return live;
      }
      throw new DeadlineExceededError(request.deadline.atMs);
    }
    const claimToken = this.ids.next().toString();
    const leaseUntil = ClaimRules.computeLeaseUntil(request, now.getTime());
    const table = this.tableName(manager);
    const tenant = this.tenantColumn
      ? { column: ', tenant_id', value: ', $7' }
      : { column: '', value: '' };
    const claimed: ClaimedRow[] = await manager.query(
      `INSERT INTO ${table} (key, state, fingerprint, claim_token, lease_until, attempt, created_at, updated_at${tenant.column}) ` +
        `VALUES ($1, $2, $3, $4, $5, 1, $6, $6${tenant.value}) ` +
        `ON CONFLICT (key) DO UPDATE SET claim_token = EXCLUDED.claim_token, lease_until = EXCLUDED.lease_until, ` +
        `attempt = ${table}.attempt + 1, updated_at = EXCLUDED.updated_at ` +
        `WHERE ${table}.state = $2 AND ${table}.lease_until <= EXCLUDED.updated_at ` +
        'RETURNING claim_token, fingerprint, attempt',
      [
        key,
        ClaimState.InProgress,
        request.fingerprint,
        claimToken,
        new Date(leaseUntil),
        now,
        ...(this.tenantColumn ? [request.tenantId ?? null] : []),
      ],
    );
    const row = claimed[0];
    if (row !== undefined && row.claim_token === claimToken) {
      return {
        state: ClaimState.Acquired,
        claimToken,
        leaseUntil,
        fingerprint: row.fingerprint,
        takeover: Number(row.attempt) > 1,
      };
    }
    const live = await this.readLive(manager, key, now.getTime());
    if (live !== undefined) {
      return live;
    }
    throw new PersistenceError(
      PersistenceErrorCode.Contention,
      'Idempotency key changed while claiming it',
    );
  }

  /** Returns the completed state, or the in-progress state with a valid lease; undefined if the key is free or expired. */
  private async readLive(
    manager: EntityManager,
    key: string,
    nowMs: number,
  ): Promise<ClaimResult<R> | undefined> {
    const row = await manager.findOneBy(this.entity, { key });
    if (row === null) {
      return undefined;
    }
    if (row.state === ClaimState.Completed) {
      return {
        state: ClaimState.Completed,
        result: this.deserialize(row.result),
        fingerprint: row.fingerprint,
      };
    }
    if (row.state !== ClaimState.InProgress) {
      throw new PersistenceError(
        PersistenceErrorCode.CorruptRow,
        'Idempotency row has an unknown state',
      );
    }
    if (row.leaseUntil === null) {
      throw new PersistenceError(
        PersistenceErrorCode.CorruptRow,
        'Idempotency row has an invalid lease',
      );
    }
    const leaseUntil = row.leaseUntil.getTime();
    return leaseUntil > nowMs
      ? {
          state: ClaimState.InProgress,
          leaseUntil,
          fingerprint: row.fingerprint,
        }
      : undefined;
  }

  /** Returns the quoted table name, to interpolate it into the raw SQL of `claim`. */
  private tableName(manager: EntityManager): string {
    return `"${manager.connection.getMetadata(this.entity).tableName}"`;
  }
}
