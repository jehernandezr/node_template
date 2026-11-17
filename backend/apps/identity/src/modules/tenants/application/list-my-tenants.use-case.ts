import { Injectable } from '@nestjs/common';
import type { MyTenantPage } from '@contracts/identity';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../access/index.js';
import { TenantReader } from './tenant-reader.js';

/** Los tenants del usuario, desde su proyección `user_tenants`, con los datos de cada tenant. */
@Injectable()
export class ListMyTenants {
  constructor(
    private readonly access: AccessFacade,
    private readonly reader: TenantReader,
  ) {}

  async execute(ref: UserRef): Promise<MyTenantPage> {
    const memberships = await this.access.tenantsOf(ref);
    const items = await Promise.all(
      memberships.map(async (membership) => {
        const tenant = await this.reader.get(membership.tenantId);
        return {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          kind: tenant.kind,
          status: tenant.status,
          joinedAt: membership.joinedAt.toISOString(),
        };
      }),
    );
    return { items, nextCursor: null };
  }
}
