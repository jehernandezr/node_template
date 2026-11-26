import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  TenantCreatedEvent,
  TenantKind,
  type CreateTenantInput,
  type TenantSummary,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../access/index.js';
import { UsersFacade } from '../../users/index.js';
import { TenantDirectory } from '../domain/tenant-directory.js';
import { TenantPlacement } from '../domain/tenant-placement.js';
import { TenantRepository } from '../domain/tenant.repository.js';
import { Tenant } from '../domain/tenant.js';
import { TenantSummaryView } from './tenant-summary-view.js';

/** Tenant creation: the owner is optional only for the tenants the region seeds. */
export interface ProvisionTenantInput extends Omit<
  CreateTenantInput,
  'ownerUserId'
> {
  readonly ownerUserId?: string;
}

/**
 * Creates a tenant in provisioning: reserves the slug, places it in its region's shards and creates in its
 * shard the row, the system roles and groups and its owner's membership. It is idempotent by `tenantId`,
 * because the creation saga may repeat it.
 */
@Injectable()
export class ProvisionTenant {
  constructor(
    private readonly tenants: TenantRepository,
    private readonly directory: TenantDirectory,
    private readonly placement: TenantPlacement,
    private readonly access: AccessFacade,
    private readonly users: UsersFacade,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  /**
   * Creates a tenant in provisioning: places it, reserves its slug, records it in every service directory and sets up its owner.
   * @param input Tenant data and owner.
   * @returns The new tenant.
   */
  async execute(input: ProvisionTenantInput): Promise<TenantSummary> {
    const owner = await this.ownerOf(input.ownerUserId);
    if (
      !(await this.directory.reserve(input.slug, input.tenantId, input.region))
    ) {
      throw new IdentityError(IdentityErrorCode.TenantSlugTaken);
    }
    await this.placement.place(
      input.tenantId,
      input.region,
      input.kind === TenantKind.SharedCustomers,
    );
    const tenant = await this.scopes.inTenantShard(input.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const existing = await this.tenants.find(input.tenantId);
        if (existing !== undefined) {
          return existing;
        }
        const created = Tenant.provision({
          id: input.tenantId,
          slug: input.slug,
          name: input.name,
          region: input.region,
          kind: input.kind,
        });
        await this.tenants.insert(created);
        await this.access.setupTenant(input.tenantId, owner);
        await this.bus.publish(
          TenantCreatedEvent,
          {
            tenantId: input.tenantId,
            slug: input.slug,
            kind: input.kind,
            region: input.region,
            ...(owner === undefined ? {} : { ownerUserId: owner.userId }),
            createdAt: this.clock.now().toISOString(),
          },
          { tenantId: input.tenantId },
        );
        return created;
      }),
    );
    if (owner !== undefined) {
      await this.access.projectMembership(input.tenantId, owner);
    }
    return TenantSummaryView.summary(
      TenantSummaryView.snapshot(tenant.snapshot()),
    );
  }

  private async ownerOf(
    userId: string | undefined,
  ): Promise<UserRef | undefined> {
    if (userId === undefined) {
      return undefined;
    }
    const ref = await this.users.refOf(userId);
    if (ref === undefined) {
      throw new IdentityError(IdentityErrorCode.UserNotFound);
    }
    return ref;
  }
}
