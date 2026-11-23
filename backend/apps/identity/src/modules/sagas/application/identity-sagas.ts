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
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { SagaDirectory } from '../domain/saga-directory.js';

/** Una saga que arranca identity: dónde vive, quién la pide y su id, que el cliente usa para consultarla. */
export interface IdentitySagaStart<TState> {
  readonly definition: SagaDefinitionClass<TState>;
  readonly saga: IdentitySaga;
  readonly sagaId: string;
  readonly tenantId: string;
  readonly requestedBy: string;
  readonly state: TState;
}

/**
 * Arranca las sagas de identity en el shard del tenant que nombran y las anota en el directorio del catálogo,
 * así quien las pidió las consulta por su id. La saga corre hasta terminar o pausarse; si se pausa, la retoma
 * `SagaRecoveryJob`.
 */
@Injectable()
export class IdentitySagas {
  /** El contrato de identity no puede importar la plataforma de sagas: repite sus estados. */
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

  constructor(
    private readonly sagas: Sagas,
    private readonly store: SagaStore,
    private readonly directory: SagaDirectory,
    private readonly scopes: IdentityShardScopes,
  ) {}

  /**
   * Se anota antes de arrancarla: si el proceso cae entre las dos escrituras, quien la pidió nunca recibió su
   * id, y la entrada sin instancia responde lo mismo que una saga que no existe.
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
        context: { tenantId: start.tenantId, actorId: start.requestedBy },
      }),
    );
  }

  /** @throws IdentityError `PLATFORM.RESOURCE.NOT_FOUND` si la saga no existe o la pidió otra persona. */
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
