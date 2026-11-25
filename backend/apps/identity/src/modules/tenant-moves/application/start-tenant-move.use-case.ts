import { Inject, Injectable } from '@nestjs/common';
import { IdentityErrorCode, IdentitySaga } from '@contracts/identity';
import { Clock, IdGenerator } from '@platform/kernel';
import { ServiceRegions } from '@platform/service';
import {
  TenantMoveConfig,
  TenantMoveTargets,
  type TenantMoveSettings,
} from '@platform/tenant-move';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentitySagas } from '../../sagas/index.js';
import { TenantsFacade } from '../../tenants/index.js';
import { TenantMoveLog } from '../domain/tenant-move-log.js';
import { TenantMovePolicy } from '../domain/tenant-move-policy.js';
import { TenantMoveStatus } from '../domain/tenant-move-status.enum.js';
import { MoveTenantSaga } from './move-tenant.saga.js';

/** What the requester of a move asks for: the tenant and the target shard group. */
export interface TenantMoveRequest {
  readonly tenantId: string;
  readonly targetGroup: string;
}

/** What the launch returns: the move's id and its saga's id. */
export interface TenantMoveLaunch {
  readonly moveId: string;
  readonly sagaId: string;
}

/**
 * Launches a tenant's move: validates the tenant and the target, records it in `tenant_moves` and starts `MoveTenant`.
 * The saga starts with the deadline `TENANT_MOVE_DEADLINE_MS`. The saga's log lives in the platform tenant's shard, which is never moved: the one of the tenant being
 * moved would be left behind its own barrier.
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
    @Inject(TenantMoveConfig.token)
    private readonly moveSettings: TenantMoveSettings,
  ) {}

  /**
   * @throws IdentityError `IDENTITY.TENANT.NOT_FOUND` if the tenant does not exist.
   * @throws IdentityError `IDENTITY.TENANT_MOVE.NOT_MOVABLE` if it is not an organization.
   * @throws IdentityError `IDENTITY.TENANT_MOVE.UNKNOWN_TARGET` if the group is not configured or its region is not part of the
   *   deployment.
   * @throws IdentityError `IDENTITY.TENANT_MOVE.IN_PROGRESS` if the tenant already has an unfinished move.
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
      deadlineMs: this.moveSettings.TENANT_MOVE_DEADLINE_MS,
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
   * A recorded move whose saga finished without touching identity, for example compensated in its first step, was left in progress
   * in the log: it is closed as cancelled and does not block a new one.
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
