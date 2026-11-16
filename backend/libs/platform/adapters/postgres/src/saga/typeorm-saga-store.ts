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

/** Colaboradores de `TypeOrmSagaStore`. */
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

/** Columnas de la bitácora que un intento nuevo reemplaza en el upsert. */
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

/** Columnas de la llave de la bitácora, para el upsert. */
const STEP_CONFLICT_COLUMNS: readonly string[] = [
  'saga_id',
  'step_index',
  'direction',
];

/** Estados que una corrida todavía tiene que atender, y los que atiende el recuperador. */
const RUNNABLE_STATUSES: readonly SagaStatus[] = [
  SagaStatus.Running,
  SagaStatus.Compensating,
];

/** Estados terminados con éxito: los que borra la retención. */
const PURGEABLE_STATUSES: readonly SagaStatus[] = [
  SagaStatus.Completed,
  SagaStatus.Compensated,
];

/**
 * `SagaStore` sobre TypeORM y Postgres. La bitácora vive en el esquema `saga`
 * del shard del tenant de la saga. Cada escritura protegida es un `UPDATE ...
 * WHERE id = :id AND version = :v AND lease_token = :t`, y la instancia y su
 * paso se guardan en la misma transacción. Toda lectura va al primario,
 * porque el fencing necesita datos recién confirmados.
 */
export class TypeOrmSagaStore extends SagaStore {
  constructor(private readonly deps: TypeOrmSagaStoreDeps) {
    super();
  }

  /**
   * Inserta la instancia en el shard del tenant del contexto. `ON CONFLICT DO
   * NOTHING` no aborta la transacción de quien llama, a diferencia de un error
   * de unicidad, así que el id repetido y la llave repetida se tratan igual.
   * @throws SagaError `DuplicateSaga` si el id o la llave ya existen.
   * @throws PersistenceError `PersistenceTenantMismatch` si la instancia es de otro tenant.
   */
  async create(instance: SagaInstance): Promise<void> {
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

  async get(id: string): Promise<SagaInstance | null> {
    const tenantId = this.tenantId();
    const entity = await this.read((manager) =>
      manager.findOneBy(SagaInstanceEntity, { id, tenantId }),
    );
    return entity === null ? null : this.deps.instances.toDomain(entity);
  }

  async findByIdempotencyKey(key: string): Promise<SagaInstance | null> {
    const tenantId = this.tenantId();
    const entity = await this.read((manager) =>
      manager.findOneBy(SagaInstanceEntity, { idempotencyKey: key, tenantId }),
    );
    return entity === null ? null : this.deps.instances.toDomain(entity);
  }

  commitStep(write: FencedWrite): Promise<SagaInstance> {
    return this.fencedWrite(write);
  }

  /** @throws SagaError `InvalidState` si la entrada no está en `Dispatched`. */
  dispatchStep(write: DispatchWrite): Promise<SagaInstance> {
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
   * Bitácora de la saga. Como texto, `forward` queda después de `compensate`:
   * ordenar `direction` de forma descendente deja primero hacia delante.
   */
  async steps(sagaId: string): Promise<StepLogEntry[]> {
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
   * Instancias que necesitan una corrida, en todos los shards. Cada shard se
   * consulta en su transacción con `FOR UPDATE SKIP LOCKED`: las filas que
   * otro nodo ya tomó se saltan. No hay petición, así que no usa el tenant del contexto.
   */
  async findRecoverable(now: Date, limit: number): Promise<SagaInstance[]> {
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

  tryAcquireLease(
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

  renewLease(id: string, token: string, until: Date): Promise<boolean> {
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

  async releaseLease(id: string, token: string): Promise<void> {
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
   * Borra las sagas terminadas con éxito y viejas, con su bitácora, en todos
   * los shards. `limit` es por shard: cada shard borra como mucho ese número en una pasada.
   */
  async purge(options: SagaPurge): Promise<number> {
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
   * Escritura protegida de la instancia y, si hay, de su entrada de bitácora,
   * en una sola transacción. Si el `UPDATE` no afecta una fila, se busca la
   * causa y se lanza el error dentro de la transacción, que así se deshace.
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
   * Explica por qué el `UPDATE` no afectó a la fila: la saga no existe, otro
   * proceso tiene el lease, o la versión cambió.
   * @throws SagaError `NotFound`, `LeaseLost` o `ConcurrentModification`
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

  /** Reemplaza el intento del mismo paso y dirección, o lo inserta. */
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

  /** Instancia candidata a una corrida. Si su contexto no traía tenant, el de la fila la completa para enrutarla. */
  private recoverable(row: SagaInstanceEntity): SagaInstance {
    const instance = this.deps.instances.toDomain(row);
    if (instance.tenantId !== null) {
      return instance;
    }
    // Este candidato solo sirve para que `SagaScopes` lo enrute al shard. El motor
    // vuelve a leer la instancia con `get`, que conserva el contexto original.
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
