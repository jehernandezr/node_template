import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AccessGrantSource, type AccessGrant } from '@platform/auth';
import { AccessFacade } from '../modules/access/index.js';

/**
 * Fuente de verdad del acceso dentro del proceso: `access` calcula los permisos. La fachada se busca en
 * cada llamada porque el módulo puede cargarse después que la autenticación.
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
