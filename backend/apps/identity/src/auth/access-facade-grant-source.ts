import { Injectable } from '@nestjs/common';
import { AccessGrantSource, type AccessGrant } from '@platform/auth';
import { AccessFacade } from '../modules/access/index.js';

/** In-process source of truth for access: `access` computes the permissions. */
@Injectable()
export class AccessFacadeGrantSource extends AccessGrantSource {
  constructor(private readonly access: AccessFacade) {
    super();
  }

  /** The permissions, roles, features, flags and permission version of the user in the tenant. */
  override async fetch(tenantId: string, userId: string): Promise<AccessGrant> {
    const access = await this.access.resolve(userId, tenantId);
    return {
      permissions: [...access.permissions],
      platformRoles: [...access.platformRoles],
      features: [...access.features],
      flags: [...access.flags],
      permissionVersion: access.permissionVersion,
    };
  }
}
