import { Injectable } from '@nestjs/common';
import { ServiceAccountStatus, type Permission } from '@contracts/identity';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { ApiKeyDirectory, ApiKeyRepository } from '../domain/api-key-store.js';
import { ApiKeysFacade } from './api-keys.facade.js';

/** `ApiKeysFacade` inside the process. */
@Injectable()
export class LocalApiKeysFacade extends ApiKeysFacade {
  constructor(
    private readonly directory: ApiKeyDirectory,
    private readonly repository: ApiKeyRepository,
    private readonly scopes: IdentityShardScopes,
  ) {
    super();
  }

  /** {@inheritDoc ApiKeysFacade.relocateTenant} */
  relocateTenant(tenantId: string, region: string): Promise<void> {
    return this.directory.relocateTenant(tenantId, region);
  }

  /** {@inheritDoc ApiKeysFacade.activeServicePermissions} */
  async activeServicePermissions(
    tenantId: string,
    serviceAccountId: string,
  ): Promise<readonly Permission[] | undefined> {
    const account = await this.scopes.inTenantShard(tenantId, () =>
      this.repository.findServiceAccount(serviceAccountId),
    );
    return account?.status === ServiceAccountStatus.Active
      ? account.permissions
      : undefined;
  }
}
