import { Injectable } from '@nestjs/common';
import { TransactionManager } from '@platform/kernel';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { TenantAccessRepository } from '../domain/access-store.js';
import { AccessVersionPublisher } from './access-version-publisher.js';

/**
 * Sube la versión de permisos del tenant cuando cambia algo que va en el acceso de todos sus miembros (las
 * funcionalidades del plan): cada servicio deja de usar el acceso que guardó y el siguiente token lo trae nuevo.
 */
@Injectable()
export class RefreshTenantAccess {
  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly versions: AccessVersionPublisher,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  execute(tenantId: string): Promise<void> {
    return this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.versions.tenantChanged(
          tenantId,
          await this.tenantAccess.bumpTenantVersion(),
        );
      }),
    );
  }
}
