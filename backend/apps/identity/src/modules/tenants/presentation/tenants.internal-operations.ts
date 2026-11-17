import { Injectable } from '@nestjs/common';
import { InternalHandler } from '@platform/internal-api/nest';
import type { HandlerResult } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';
import {
  CreateTenantOperation,
  DiscardTenantOperation,
  SuspendTenantOperation,
  ReactivateTenantOperation,
  ActivateTenantOperation,
  identityContract,
  type CreateTenantInput,
  type SuspendTenantInput,
  type TenantOperationResult,
  type TenantRefInput,
  type TenantSummary,
} from '@contracts/identity';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';
import { ChangeTenantStatus } from '../application/change-tenant-status.use-case.js';
import { ProvisionTenant } from '../application/provision-tenant.use-case.js';

/** Operaciones internas de tenants. Las de traslado llegan con `MoveTenant`. */
@Injectable()
export class TenantsInternalOperations {
  constructor(
    private readonly provision: ProvisionTenant,
    private readonly status: ChangeTenantStatus,
  ) {}

  @InternalHandler(CreateTenantOperation)
  async createTenant(
    input: CreateTenantInput,
  ): Promise<HandlerResult<TenantSummary>> {
    return {
      outcome: CallOutcome.success(await this.provision.execute(input)),
    };
  }

  @InternalHandler(DiscardTenantOperation)
  async discardTenant(
    input: TenantRefInput,
  ): Promise<HandlerResult<TenantOperationResult>> {
    return {
      outcome: CallOutcome.success(await this.status.discard(input.tenantId)),
    };
  }

  @InternalHandler(SuspendTenantOperation)
  async suspendTenant(
    input: SuspendTenantInput,
  ): Promise<HandlerResult<TenantOperationResult>> {
    return {
      outcome: CallOutcome.success(await this.status.suspend(input.tenantId)),
    };
  }

  @InternalHandler(ReactivateTenantOperation)
  async reactivateTenant(
    input: TenantRefInput,
  ): Promise<HandlerResult<TenantOperationResult>> {
    return {
      outcome: CallOutcome.success(
        await this.status.reactivate(input.tenantId),
      ),
    };
  }

  @InternalHandler(ActivateTenantOperation)
  async activateTenant(
    input: TenantRefInput,
  ): Promise<HandlerResult<TenantOperationResult>> {
    return {
      outcome: CallOutcome.success(await this.status.activate(input.tenantId)),
    };
  }

  @InternalHandler(identityContract.operations.tenantMoveSync)
  tenantMoveSync(): never {
    throw new RouteNotImplementedError(
      identityContract.operations.tenantMoveSync.id,
    );
  }

  @InternalHandler(identityContract.operations.tenantMoveFinalize)
  tenantMoveFinalize(): never {
    throw new RouteNotImplementedError(
      identityContract.operations.tenantMoveFinalize.id,
    );
  }

  @InternalHandler(identityContract.operations.tenantMoveAbort)
  tenantMoveAbort(): never {
    throw new RouteNotImplementedError(
      identityContract.operations.tenantMoveAbort.id,
    );
  }

  @InternalHandler(identityContract.operations.tenantMoveCleanup)
  tenantMoveCleanup(): never {
    throw new RouteNotImplementedError(
      identityContract.operations.tenantMoveCleanup.id,
    );
  }
}
