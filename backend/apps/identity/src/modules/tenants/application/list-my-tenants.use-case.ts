import { Injectable } from '@nestjs/common';
import type { MyTenantPage, MyTenantSummary } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade, type UserTenant } from '../../access/index.js';
import { TenantReader } from './tenant-reader.js';

/**
 * The tenants of the user, from their `user_tenants` projection, with the data of each tenant. A projection
 * whose tenant no longer exists is left out: one missing tenant never hides the others.
 */
@Injectable()
export class ListMyTenants {
  constructor(
    private readonly access: AccessFacade,
    private readonly reader: TenantReader,
  ) {}

  /**
   * Lists the tenants of a user.
   * @param ref User.
   * @returns The tenants that still exist, with the date the user joined each.
   */
  async execute(ref: UserRef): Promise<MyTenantPage> {
    const memberships = await this.access.tenantsOf(ref);
    const items = await Promise.all(
      memberships.map((membership) => this.itemOf(membership)),
    );
    return {
      items: items.filter(
        (item): item is MyTenantSummary => item !== undefined,
      ),
      nextCursor: null,
    };
  }

  private async itemOf(
    membership: UserTenant,
  ): Promise<MyTenantSummary | undefined> {
    const tenant = await this.reader.find(membership.tenantId);
    return tenant === undefined
      ? undefined
      : {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          kind: tenant.kind,
          status: tenant.status,
          joinedAt: membership.joinedAt.toISOString(),
        };
  }
}
