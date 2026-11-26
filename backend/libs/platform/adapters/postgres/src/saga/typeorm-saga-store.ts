import type { LoggerPort } from '@platform/observability';
import {
  AcrossShards,
  EntityManagerProvider,
  ManagerIntent,
  PersistenceContextProvider,
  PersistenceError,
  PersistenceFeature,
  ShardScope,
  PersistenceErrorCode,
} from '@platform/persistence';
import {
  SagaError,
  SagaErrorCode,
  SagaInstance,
  SagaStatus,
  SagaStore,
  StepStatus,
  type DispatchWrite,
  type FencedWrite,
  type SagaPurge,
  type StepLogEntry,
} from '@platform/saga';
import type { EntityManager, QueryDeepPartialEntity } from 'typeorm';
import { SagaInstanceEntity } from './saga-instance.entity.js';
import type { SagaInstanceMapper } from './saga-instance.mapper.js';
import { SagaStepLogEntity } from './saga-step-log.entity.js';
import type { SagaStepLogMapper } from './saga-step-log.mapper.js';

/** Collaborators of `TypeOrmSagaStore`. */
export interface TypeOrmSagaStoreDeps {
  readonly provider: EntityManagerProvider;
  readonly feature: PersistenceFeature;
  readonly context: PersistenceContextProvider;
  readonly scope: ShardScope;
  readonly acrossShards: AcrossShards;
  readonly instances: SagaInstanceMapper;
  readonly steps: SagaStepLogMapper;
  readonly logger?: LoggerPort;
}

/** Log columns that a new attempt replaces in the upsert. */
const STEP_OVERWRITE_COLUMNS: readonly string[] = [
  'operation_id',
  'status',
  'idempotency_key',
  'input',
  'output',
  'error_code',
  'traceparent',
  'started_at',
  'finished_at',
];

/** Log key columns, for the upsert. */
const STEP_CONFLICT_COLUMNS: readonly string[] = [
  'saga_id',
  'step_index',
  'direction',
];

/** Statuses that a run still has to handle, and the ones the recoverer handles. */
const RUNNABLE_STATUSES: readonly SagaStatus[] = [
  SagaStatus.Running,
  SagaStatus.Compensating,
];

/** Statuses finished successfully: the ones retention deletes. */
const PURGEABLE_STATUSES: readonly SagaStatus[] = [
  SagaStatus.Completed,
  SagaStatus.Compensated,
];

/**
 * `SagaStore` on TypeORM and Postgres. The log lives in the `saga` schema
 * of the shard of the saga tenant. Each guarded write is an `UPDATE ...
 * WHERE id = :id AND version = :v AND lease_token = :t`, and the instance and its
 * step are saved in the same transaction. Every read goes to the primary,
 * because fencing needs freshly committed data.
 */
export class TypeOrmSagaStore extends SagaStore {
  constructor(private readonly deps: TypeOrmSagaStoreDeps) {
    super();
  }

  /**
   * Inserts the instance in the shard of the context tenant. `ON CONFLICT DO
   * NOTHING` does not abort the caller's transaction, unlike a uniqueness
   * error, so a repeated id and a repeated key are treated the same.
   * @throws SagaError `DuplicateSaga` if the id or the key already exist.
   * @throws PersistenceError `PersistenceTenantMismatch` if the instance belongs to another tenant.
   */
  override async create(instance: SagaInstance): Promise<void> {
    const tenantId = this.tenantId();
    if (instance.tenantId !== null && instance.tenantId !== tenantId) {
      throw new PersistenceError(
        PersistenceErrorCode.TenantMismatch,
        'The saga belongs to another tenant',
      );
    }
    const row = this.deps.instances.toPersistence(instance, tenantId);
    await this.write(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .insert()
        .into(SagaInstanceEntity)
        .values(row as QueryDeepPartialEntity<SagaInstanceEntity>)
        .orIgnore()
        .returning('id')
        .execute();
      if (result.raw.length === 0) {
        throw new SagaError(
          SagaErrorCode.DuplicateSaga,
          `Saga ${instance.id} or its idempotency key already exists`,
        );
      }
    });
  }

  override async get(id: string): Promise<SagaInstance | null> {
    const tenantId = this.tenantId();
    const entity = await this.read((manager) =>
      manager.findOneBy(SagaInstanceEntity, { id, tenantId }),
    );
    return entity === null ? null : this.deps.instances.toDomain(entity);
  }

  override async findByIdempotencyKey(
    key: string,
  ): Promise<SagaInstance | null> {
    const tenantId = this.tenantId();
    const entity = await this.read((manager) =>
      manager.findOneBy(SagaInstanceEntity, { idempotencyKey: key, tenantId }),
    );
    return entity === null ? null : this.deps.instances.toDomain(entity);
  }

  override commitStep(write: FencedWrite): Promise<SagaInstance> {
    return this.fencedWrite(write);
  }

  /** @throws SagaError `InvalidState` if the entry is not in `Dispatched`. */
  override dispatchStep(write: DispatchWrite): Promise<SagaInstance> {
    if (write.step.status !== StepStatus.Dispatched) {
      return Promise.reject(
        new SagaError(
          SagaErrorCode.InvalidState,
          'dispatchStep requires a step in Dispatched status',
        ),
      );
    }
    return this.fencedWrite(write);
  }

  /**
   * Returns the saga log. As text, `forward` sorts after `compensate`:
   * ordering `direction` descending puts forward first.
   */
  override async steps(sagaId: string): Promise<StepLogEntry[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
      manager
        .createQueryBuilder(SagaStepLogEntity, 's')
        .innerJoin(SagaInstanceEntity, 'i', 'i.id = s.sagaId')
        .where('s.sagaId = :sagaId AND i.tenantId = :tenantId', {
          sagaId,
          tenantId,
        })
        .orderBy('s.stepIndex', 'ASC')
        .addOrderBy('s.direction', 'DESC')
        .getMany(),
    );
    return rows.map((row) => this.deps.steps.toDomain(row));
  }

  /**
   * Returns the instances that need a run, across all shards. Each shard is
   * queried in its own transaction with `FOR UPDATE SKIP LOCKED`: rows that
   * another node already took are skipped. There is no request, so it does not use the context tenant.
   */
  override async findRecoverable(
    now: Date,
    limit: number,
  ): Promise<SagaInstance[]> {
    const result = await this.deps.acrossShards.run(({ dataSource }) =>
      dataSource.transaction((manager) =>
        manager
          .createQueryBuilder(SagaInstanceEntity, 'i')
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .where(
            '(i.status IN (:...running) AND (i.leaseUntil IS NULL OR i.leaseUntil <= :now)) OR (i.status = :suspended AND i.nextAttemptAt IS NOT NULL AND i.nextAttemptAt <= :now)',
            {
              running: RUNNABLE_STATUSES,
              suspended: SagaStatus.Suspended,
              now,
            },
          )
          .orderBy('i.updatedAt', 'ASC')
          .addOrderBy('i.id', 'ASC')
          .limit(limit)
          .getMany(),
      ),
    );
    if (result.partial) {
      this.deps.logger?.warn('saga recovery skipped shards', {
        failures: result.failures,
      });
    }
    const rows = result.results
      .flatMap((shard) => shard.value)
      .sort(
        (a, b) =>
          a.updatedAt.getTime() - b.updatedAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .slice(0, limit);
    return rows.map((row) => this.recoverable(row));
  }

  override tryAcquireLease(
    id: string,
    token: string,
    until: Date,
    now: Date,
  ): Promise<boolean> {
    const tenantId = this.tenantId();
    return this.write(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(SagaInstanceEntity)
        .set({ leaseToken: token, leaseUntil: until })
        .where(
          '"id" = :id AND "tenant_id" = :tenantId AND ("lease_token" IS NULL OR "lease_until" IS NULL OR "lease_until" <= :now)',
          { id, tenantId, now },
        )
        .execute();
      return result.affected === 1;
    });
  }

  override renewLease(
    id: string,
    token: string,
    until: Date,
  ): Promise<boolean> {
    const tenantId = this.tenantId();
    return this.write(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(SagaInstanceEntity)
        .set({ leaseUntil: until })
        .where(
          '"id" = :id AND "tenant_id" = :tenantId AND "lease_token" = :token',
          {
            id,
            tenantId,
            token,
          },
        )
        .execute();
      return result.affected === 1;
    });
  }

  override async releaseLease(id: string, token: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager
        .createQueryBuilder()
        .update(SagaInstanceEntity)
        .set({ leaseToken: null, leaseUntil: null })
        .where(
          '"id" = :id AND "tenant_id" = :tenantId AND "lease_token" = :token',
          {
            id,
            tenantId,
            token,
          },
        )
        .execute(),
    );
  }

  /**
   * Deletes old sagas finished successfully, with their log, across all
   * shards. `limit` is per shard: each shard deletes at most that number in one pass.
   */
  override async purge(options: SagaPurge): Promise<number> {
    const limit = options.limit ?? SagaStore.DEFAULT_PURGE_LIMIT;
    const result = await this.deps.acrossShards.run(({ dataSource }) =>
      dataSource.transaction(async (manager) => {
        const doomed = await manager
          .createQueryBuilder(SagaInstanceEntity, 'i')
          .select(['i.id'])
          .setLock('pessimistic_write')
          .setOnLocked('skip_locked')
          .where('i.status IN (:...statuses) AND i.updatedAt < :before', {
            statuses: PURGEABLE_STATUSES,
            before: options.before,
          })
          .orderBy('i.updatedAt', 'ASC')
          .limit(limit)
          .getMany();
        const ids = doomed.map((row) => row.id);
        if (ids.length === 0) {
          return 0;
        }
        await manager
          .createQueryBuilder()
          .delete()
          .from(SagaStepLogEntity)
          .where('"saga_id" IN (:...ids)', { ids })
          .execute();
        await manager
          .createQueryBuilder()
          .delete()
          .from(SagaInstanceEntity)
          .where('"id" IN (:...ids)', { ids })
          .execute();
        return ids.length;
      }),
    );
    if (result.partial) {
      this.deps.logger?.warn('saga purge skipped shards', {
        failures: result.failures,
      });
    }
    return result.results.reduce((total, shard) => total + shard.value, 0);
  }

  /**
   * Guarded write of the instance and, if present, of its log entry,
   * in a single transaction. If the `UPDATE` does not affect a row, the
   * cause is looked up and the error is thrown inside the transaction, which is thereby rolled back.
   */
  private fencedWrite(write: FencedWrite): Promise<SagaInstance> {
    const tenantId = this.tenantId();
    const instance = write.instance;
    const props = instance.toProps();
    return this.write(async (manager) => {
      const update = await manager
        .createQueryBuilder()
        .update(SagaInstanceEntity)
        .set({
          status: props.status,
          state: (props.state === undefined
            ? null
            : props.state) as QueryDeepPartialEntity<unknown>,
          currentStep: props.currentStep,
          direction: props.direction,
          attempts: props.attempts,
          suspendedSince: props.suspendedSince,
          nextAttemptAt: props.nextAttemptAt,
          deadlineAt: props.deadlineAt,
          lastErrorCode: props.lastErrorCode,
          lastErrorDetail: props.lastErrorDetail,
          context: props.context,
          updatedAt: props.updatedAt,
          version: () => '"version" + 1',
        })
        .where(
          '"id" = :id AND "tenant_id" = :tenantId AND "version" = :expectedVersion AND "lease_token" = :leaseToken',
          {
            id: instance.id,
            tenantId,
            expectedVersion: write.expectedVersion,
            leaseToken: write.leaseToken,
          },
        )
        .execute();
      if (update.affected !== 1) {
        await this.throwFenceFailure(
          manager,
          instance.id,
          tenantId,
          write.leaseToken,
        );
      }
      if (write.step !== undefined) {
        await this.upsertStep(manager, write.step);
      }
      const saved = await manager.findOneByOrFail(SagaInstanceEntity, {
        id: instance.id,
        tenantId,
      });
      return this.deps.instances.toDomain(saved);
    });
  }

  /**
   * Explains why the `UPDATE` did not affect the row: the saga does not exist, another
   * process holds the lease, or the version changed.
   * @throws SagaError `NotFound`, `LeaseLost` or `ConcurrentModification`
   */
  private async throwFenceFailure(
    manager: EntityManager,
    id: string,
    tenantId: string,
    leaseToken: string,
  ): Promise<never> {
    const current = await manager.findOneBy(SagaInstanceEntity, {
      id,
      tenantId,
    });
    if (current === null) {
      throw new SagaError(SagaErrorCode.NotFound, `Saga ${id} not found`);
    }
    if (current.leaseToken !== leaseToken) {
      throw new SagaError(
        SagaErrorCode.LeaseLost,
        `Lease on saga ${id} was lost`,
      );
    }
    throw new SagaError(
      SagaErrorCode.ConcurrentModification,
      `Saga ${id} was modified by another run`,
    );
  }

  /** Replaces the attempt of the same step and direction, or inserts it. */
  private async upsertStep(
    manager: EntityManager,
    step: StepLogEntry,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(SagaStepLogEntity)
      .values(
        this.deps.steps.toPersistence(
          step,
        ) as QueryDeepPartialEntity<SagaStepLogEntity>,
      )
      .orUpdate([...STEP_OVERWRITE_COLUMNS], [...STEP_CONFLICT_COLUMNS])
      .execute();
  }

  /**
   * Returns the instance that is a candidate for a run. If its context had no tenant, the row's tenant completes it for routing.
   * This candidate only serves so `SagaScopes` routes it to the shard. The engine reads the instance again with `get`, which keeps the original context.
   */
  private recoverable(row: SagaInstanceEntity): SagaInstance {
    const instance = this.deps.instances.toDomain(row);
    if (instance.tenantId !== null) {
      return instance;
    }
    return SagaInstance.rehydrate({
      ...instance.toProps(),
      context: { ...(instance.context ?? {}), tenantId: row.tenantId },
    });
  }

  private tenantId(): string {
    const tenantId =
      this.deps.scope.current()?.tenantId ??
      this.deps.context.current().tenantId;
    if (tenantId === undefined) {
      throw new PersistenceError(
        PersistenceErrorCode.TenantRequired,
        'The request context has no tenant',
      );
    }
    return tenantId;
  }

  private read<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.deps.provider.run(
      { feature: this.deps.feature, intent: ManagerIntent.ReadPrimary },
      fn,
    );
  }

  private write<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.deps.provider.run(
      { feature: this.deps.feature, intent: ManagerIntent.Write },
      fn,
    );
  }
}
