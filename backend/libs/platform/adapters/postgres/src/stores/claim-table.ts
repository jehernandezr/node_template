import { PlatformErrorCode } from '@contracts/platform';
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
import { ManagerIntent, PersistenceError } from '@platform/persistence';
import type {
  EntityManager,
  EntityTarget,
  QueryDeepPartialEntity,
} from 'typeorm';
import type { PlatformEntityManagers } from '../database/platform-entity-managers.js';
import type { ClaimRecordEntity } from '../entities/claim-record.entity.js';
import type { ClaimTableOptions } from '../model/claim-table-options.js';

/** Fila que devuelve el `INSERT ... ON CONFLICT` de `claim`. El SQL crudo entrega los nombres de columna tal cual. */
interface ClaimedRow {
  readonly claim_token: string | null;
  readonly fingerprint: string;
  readonly attempt: number | string;
}

/**
 * Lógica de una tabla de claims de tres fases con el mismo fencing que `InMemoryIdempotencyStore`. Se parametriza
 * con la entidad (`IdempotencyKeyEntity` o `ProcessedMessageEntity`) y el tipo del resultado `R`; los stores la
 * usan por composición.
 */
export class ClaimTable<R> {
  private readonly serialize: (result: R) => unknown;
  private readonly deserialize: (stored: unknown) => R;

  constructor(
    private readonly entity: EntityTarget<ClaimRecordEntity>,
    private readonly managers: PlatformEntityManagers,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    options: ClaimTableOptions<R> = {},
  ) {
    this.serialize = options.serialize ?? ((result: R): unknown => result);
    this.deserialize =
      options.deserialize ?? ((stored: unknown): R => stored as R);
  }

  async claim(key: string, request: ClaimRequest): Promise<ClaimResult<R>> {
    ClaimRules.assertInput(key, request.fingerprint);
    return this.managers.run(ManagerIntent.Write, (manager) =>
      this.claimIn(manager, key, request),
    );
  }

  async complete(key: string, claimToken: string, result: R): Promise<void> {
    const affected = await this.managers.run(
      ManagerIntent.Write,
      async (manager) => {
        const outcome = await manager
          .createQueryBuilder()
          .update(this.entity)
          .set({
            state: ClaimState.Completed,
            // TypeORM tipa la columna `jsonb` como parcial de `unknown` y no admite `null` ahí; el `null` es el valor SQL.
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

  /** Borra resultados completados antes de `before`; recorre todos los shards si no hay uno fijo. Devuelve cuántos borró. */
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
   * Corre entero dentro del manager que recibe: el `SELECT` de la fila viva y el `INSERT` deben ver el mismo estado
   * y, con el `Write`, quedar en la misma transacción.
   */
  private async claimIn(
    manager: EntityManager,
    key: string,
    request: ClaimRequest,
  ): Promise<ClaimResult<R>> {
    const now = this.clock.now();
    if (request.deadline.atMs <= now.getTime()) {
      // Sin tiempo para correr la operación solo sirve un resultado ya guardado.
      const live = await this.readLive(manager, key, now.getTime());
      if (live !== undefined) {
        return live;
      }
      throw new DeadlineExceededError(request.deadline.atMs);
    }
    const claimToken = this.ids.next().toString();
    const leaseUntil = ClaimRules.computeLeaseUntil(request, now.getTime());
    const table = this.tableName(manager);
    // `orUpdate` de TypeORM no admite el WHERE del conflicto, y Postgres no devuelve fila si ese WHERE no se cumple.
    // El token propio dice si se tomó la llave.
    const claimed: ClaimedRow[] = await manager.query(
      `INSERT INTO ${table} (key, state, fingerprint, claim_token, lease_until, attempt, created_at, updated_at) ` +
        'VALUES ($1, $2, $3, $4, $5, 1, $6, $6) ' +
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
    // La fila se liberó o venció entre las dos sentencias: quien llama reintenta.
    throw new PersistenceError(
      PlatformErrorCode.PersistenceContention,
      'Idempotency key changed while claiming it',
    );
  }

  /** Estado completado o en curso con lease vigente; undefined si la llave está libre o vencida. */
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
        PlatformErrorCode.PersistenceCorruptRow,
        'Idempotency row has an unknown state',
      );
    }
    if (row.leaseUntil === null) {
      throw new PersistenceError(
        PlatformErrorCode.PersistenceCorruptRow,
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

  /** Nombre de la tabla entre comillas, para interpolarlo en el SQL crudo del `claim`. */
  private tableName(manager: EntityManager): string {
    return `"${manager.connection.getMetadata(this.entity).tableName}"`;
  }
}
