import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, IdentitySaga } from '@contracts/identity';
import { Clock, IdGenerator } from '@platform/kernel';
import { ServiceRegions } from '@platform/service';
import { TenantMoveTargets } from '@platform/tenant-move';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentitySagas } from '../../sagas/index.js';
import { TenantsFacade } from '../../tenants/index.js';
import { TenantMoveLog } from '../domain/tenant-move-log.js';
import { TenantMovePolicy } from '../domain/tenant-move-policy.js';
import { TenantMoveStatus } from '../domain/tenant-move-status.enum.js';
import { MoveTenantSaga } from './move-tenant.saga.js';

/** Lo que pide quien lanza un traslado: el tenant y el grupo de shards de destino. */
export interface TenantMoveRequest {
  readonly tenantId: string;
  readonly targetGroup: string;
}

/** Lo que devuelve el lanzamiento: el id del traslado y el de su saga. */
export interface TenantMoveLaunch {
  readonly moveId: string;
  readonly sagaId: string;
}

/**
 * Lanza el traslado de un tenant: valida el tenant y el destino, lo anota en `tenant_moves` y arranca `MoveTenant`.
 * La bitácora de la saga vive en el shard del tenant de plataforma, que nunca se traslada: la del tenant que se
 * mueve quedaría atrás de su propia barrera.
 */
@Injectable()
export class StartTenantMove {
  constructor(
    private readonly tenants: TenantsFacade,
    private readonly targets: TenantMoveTargets,
    private readonly regions: ServiceRegions,
    private readonly log: TenantMoveLog,
    private readonly sagas: IdentitySagas,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  /**
   * @throws IdentityError `IDENTITY.TENANT.NOT_FOUND` si el tenant no existe.
   * @throws IdentityError `IDENTITY.TENANT_MOVE.NOT_MOVABLE` si no es una organización.
   * @throws IdentityError `IDENTITY.TENANT_MOVE.UNKNOWN_TARGET` si el grupo no está configurado o su región no es del
   *   despliegue.
   * @throws IdentityError `IDENTITY.TENANT_MOVE.IN_PROGRESS` si el tenant ya tiene un traslado sin terminar.
   */
  async execute(request: TenantMoveRequest): Promise<TenantMoveLaunch> {
    const tenant = await this.tenants.get(request.tenantId);
    TenantMovePolicy.assertMovable(tenant);
    const targetRegion = this.regionOf(request.targetGroup);
    await this.assertNoMoveInProgress(request.tenantId);

    const launch = {
      moveId: this.ids.next().toString(),
      sagaId: this.ids.next().toString(),
    };
    const started = await this.log.start({
      ...launch,
      tenantId: request.tenantId,
      targetGroup: request.targetGroup,
      targetRegion,
      status: TenantMoveStatus.Running,
      startedAt: this.clock.now(),
    });
    if (!started) {
      throw new IdentityError(IdentityErrorCode.TenantMoveInProgress);
    }
    const platformTenantId = this.settings.values.IDENTITY_PLATFORM_TENANT_ID;
    await this.sagas.start({
      definition: MoveTenantSaga,
      saga: IdentitySaga.MoveTenant,
      sagaId: launch.sagaId,
      tenantId: platformTenantId,
      requestedBy: platformTenantId,
      state: {
        moveId: launch.moveId,
        tenantId: request.tenantId,
        targetGroup: request.targetGroup,
        targetRegion,
      },
    });
    return launch;
  }

  private regionOf(group: string): string {
    const target = this.targets.find(group);
    const known = this.regions.all();
    const regionDeclared =
      target !== undefined &&
      (known.length === 0 ||
        known.some((region) => region.code === target.region));
    if (target === undefined || !regionDeclared) {
      throw new IdentityError(IdentityErrorCode.TenantMoveUnknownTarget);
    }
    return target.region;
  }

  /**
   * Un traslado anotado cuya saga terminó sin tocar identity, por ejemplo compensada en su primer paso, quedó en curso
   * en la bitácora: se cierra como cancelado y no bloquea uno nuevo.
   */
  private async assertNoMoveInProgress(tenantId: string): Promise<void> {
    const running = await this.log.runningFor(tenantId);
    if (running === undefined) {
      return;
    }
    if (await this.sagas.isUnsettled(running.sagaId)) {
      throw new IdentityError(IdentityErrorCode.TenantMoveInProgress);
    }
    await this.log.markAborted(running.moveId);
  }
}
