import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  IdentitySagaStatus,
  type IdentitySaga,
  type SagaSummary,
} from '@contracts/identity';
import {
  Sagas,
  SagaStatus,
  SagaStore,
  type SagaDefinitionClass,
  type SagaInstance,
} from '@platform/saga';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { SagaDirectory } from '../domain/saga-directory.js';

/** A saga that identity starts: where it lives, who requests it and its id, which the client uses to query it. */
export interface IdentitySagaStart<TState> {
  readonly definition: SagaDefinitionClass<TState>;
  readonly saga: IdentitySaga;
  readonly sagaId: string;
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly state: TState;
  /** Deadline from start: if passed before the pivot, the saga compensates. */
  readonly deadlineMs?: number;
}

/**
 * Starts identity's sagas in the shard of the tenant they name and registers them in the catalog directory,
 * so whoever requested them queries them by their id. The saga runs until it finishes or pauses; if it pauses,
 * `SagaRecoveryJob` resumes it.
 */
@Injectable()
export class IdentitySagas {
  /** The identity contract cannot import the saga platform: it repeats its states. */
  private static readonly STATUS: Readonly<
    Record<SagaStatus, IdentitySagaStatus>
  > = {
    [SagaStatus.Running]: IdentitySagaStatus.Running,
    [SagaStatus.Suspended]: IdentitySagaStatus.Suspended,
    [SagaStatus.Compensating]: IdentitySagaStatus.Compensating,
    [SagaStatus.Completed]: IdentitySagaStatus.Completed,
    [SagaStatus.Compensated]: IdentitySagaStatus.Compensated,
    [SagaStatus.CompensationFailed]: IdentitySagaStatus.CompensationFailed,
    [SagaStatus.RequiresIntervention]: IdentitySagaStatus.RequiresIntervention,
  };
  private static readonly FINISHED: ReadonlySet<SagaStatus> = new Set([
    SagaStatus.Completed,
    SagaStatus.Compensated,
    SagaStatus.CompensationFailed,
  ]);

  /** They finished successfully or were fully undone: nothing is left half done. */
  private static readonly SETTLED: ReadonlySet<SagaStatus> = new Set([
    SagaStatus.Completed,
    SagaStatus.Compensated,
  ]);

  constructor(
    private readonly sagas: Sagas,
    private readonly store: SagaStore,
    private readonly directory: SagaDirectory,
    private readonly scopes: ShardScopes,
  ) {}

  /**
   * It is registered before starting it: if the process crashes between the two writes, the requester never received its
   * id, and the entry without an instance responds the same as a saga that does not exist.
   */
  async start<TState>(start: IdentitySagaStart<TState>): Promise<void> {
    await this.directory.record({
      sagaId: start.sagaId,
      saga: start.saga,
      tenantId: start.tenantId,
      requestedBy: start.requestedBy,
    });
    await this.scopes.inTenantShard(start.tenantId, () =>
      this.sagas.start(start.definition, start.state, {
        sagaId: start.sagaId,
        idempotencyKey: start.sagaId,
        ...(start.deadlineMs === undefined
          ? {}
          : { deadlineMs: start.deadlineMs }),
        context: { tenantId: start.tenantId, actorId: start.requestedBy },
      }),
    );
  }

  /**
   * Whether the saga can still change something: it runs, waits for a retry, compensates or asks for intervention. A saga that
   * never got to start is not in progress.
   */
  async isUnsettled(sagaId: string): Promise<boolean> {
    const entry = await this.directory.find(sagaId);
    if (entry === undefined) {
      return false;
    }
    const instance = await this.scopes.inTenantShard(entry.tenantId, () =>
      this.store.get(sagaId),
    );
    return instance !== null && !IdentitySagas.SETTLED.has(instance.status);
  }

  /** @throws IdentityError `PLATFORM.RESOURCE.NOT_FOUND` if the saga does not exist or another person requested it. */
  async summary(sagaId: string, userId: string): Promise<SagaSummary> {
    const entry = await this.directory.find(sagaId);
    if (entry === undefined || entry.requestedBy !== userId) {
      throw IdentityError.notFound();
    }
    const instance = await this.scopes.inTenantShard(entry.tenantId, () =>
      this.store.get(sagaId),
    );
    if (instance === null) {
      throw IdentityError.notFound();
    }
    return IdentitySagas.summaryOf(entry.saga, instance);
  }

  private static summaryOf(
    saga: IdentitySaga,
    instance: SagaInstance,
  ): SagaSummary {
    return {
      sagaId: instance.id,
      saga,
      status: IdentitySagas.STATUS[instance.status],
      startedAt: instance.createdAt.toISOString(),
      finishedAt: IdentitySagas.FINISHED.has(instance.status)
        ? instance.updatedAt.toISOString()
        : null,
    };
  }
}
