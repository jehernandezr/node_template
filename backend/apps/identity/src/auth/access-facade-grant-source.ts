import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AccessGrantSource, type AccessGrant } from '@platform/auth';
import { AccessFacade } from '../modules/access/index.js';

/**
 * In-process source of truth for access: `access` computes the permissions. The facade is looked up on
 * each call because the module may load after authentication.
 */
@Injectable()
export class AccessFacadeGrantSource extends AccessGrantSource {
  constructor(private readonly modules: ModuleRef) {
    super();
  }

  async fetch(tenantId: string, userId: string): Promise<AccessGrant> {
    const facade = this.modules.get(AccessFacade, { strict: false });
    const access = await facade.resolve(userId, tenantId);
    return {
      permissions: [...access.permissions],
      platformRoles: [...access.platformRoles],
      features: [...access.features],
      flags: [...access.flags],
      permissionVersion: access.permissionVersion,
    };
  }
}
