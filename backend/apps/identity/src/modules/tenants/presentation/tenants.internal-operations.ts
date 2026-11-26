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
  type CreateTenantInput,
  type SuspendTenantInput,
  type TenantOperationResult,
  type TenantRefInput,
  type TenantSummary,
} from '@contracts/identity';
import { ChangeTenantStatus } from '../application/change-tenant-status.use-case.js';
import { ProvisionTenant } from '../application/provision-tenant.use-case.js';

/** Internal operations the tenant sagas call to create, discard, suspend, reactivate and activate tenants. */
@Injectable()
export class TenantsInternalOperations {
  constructor(
    private readonly provision: ProvisionTenant,
    private readonly status: ChangeTenantStatus,
  ) {}

  /**
   * Internal operation that provisions a tenant.
   * @param input Tenant data and owner.
   * @returns The new tenant.
   */
  @InternalHandler(CreateTenantOperation)
  async createTenant(
    input: CreateTenantInput,
  ): Promise<HandlerResult<TenantSummary>> {
    return {
      outcome: CallOutcome.success(await this.provision.execute(input)),
    };
  }

  /**
   * Internal operation that discards a tenant still provisioning, the compensation of creating it.
   * @param input Tenant to discard.
   * @returns The outcome.
   */
  @InternalHandler(DiscardTenantOperation)
  async discardTenant(
    input: TenantRefInput,
  ): Promise<HandlerResult<TenantOperationResult>> {
    return {
      outcome: CallOutcome.success(await this.status.discard(input.tenantId)),
    };
  }

  /**
   * Blocks a tenant on behalf of another service: announces it and raises the tenant epoch, so the access tokens
   * issued before stop working.
   * @param input Tenant and reason.
   * @returns The outcome.
   */
  @InternalHandler(SuspendTenantOperation)
  async suspendTenant(
    input: SuspendTenantInput,
  ): Promise<HandlerResult<TenantOperationResult>> {
    return {
      outcome: CallOutcome.success(await this.status.suspend(input.tenantId)),
    };
  }

  /**
   * Internal operation that reactivates a suspended tenant.
   * @param input Tenant to reactivate.
   * @returns The outcome.
   */
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

  /**
   * Internal operation that activates a provisioned tenant.
   * @param input Tenant to activate.
   * @returns The outcome.
   */
  @InternalHandler(ActivateTenantOperation)
  async activateTenant(
    input: TenantRefInput,
  ): Promise<HandlerResult<TenantOperationResult>> {
    return {
      outcome: CallOutcome.success(await this.status.activate(input.tenantId)),
    };
  }
}
