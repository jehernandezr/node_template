import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { ApiKeysFacade } from '../application/api-keys.facade.js';
import { AuthenticateApiKey } from '../application/authenticate-api-key.use-case.js';
import { LocalApiKeysFacade } from '../application/local-api-keys.facade.js';
import { FlushApiKeyUsageJob } from '../application/flush-api-key-usage.job.js';
import { GrantablePermissions } from '../application/grantable-permissions.js';
import { ManageApiKeys } from '../application/manage-api-keys.use-case.js';
import { ManageServiceAccounts } from '../application/manage-service-accounts.use-case.js';
import {
  ApiKeyDirectory,
  ApiKeyRepository,
  ApiKeySecretHasher,
} from '../domain/api-key-store.js';
import { ApiKeyUsageBuffer } from '../domain/api-key-usage-buffer.js';
import { EphemeralApiKeyUsageBuffer } from '../infrastructure/ephemeral-api-key-usage-buffer.js';
import { HmacApiKeySecretHasher } from '../infrastructure/hmac-api-key-secret-hasher.js';
import { IdentityApiKeyResolver } from '../infrastructure/identity-api-key-resolver.js';
import { ApiKeyLookupEntity } from '../infrastructure/persistence/entities/api-key-lookup.entity.js';
import { ApiKeyEntity } from '../infrastructure/persistence/entities/api-key.entity.js';
import { ServiceAccountEntity } from '../infrastructure/persistence/entities/service-account.entity.js';
import { TypeOrmApiKeyDirectory } from '../infrastructure/persistence/typeorm-api-key-directory.js';
import { TypeOrmApiKeyRepository } from '../infrastructure/persistence/typeorm-api-key.repository.js';
import { ApiKeysController } from './api-keys.controller.js';
import { ApiKeysInternalOperations } from './api-keys.internal-operations.js';

import { AccessCoreModule } from '../../access/module.js';
import { AuthenticationModule } from '../../authentication/module.js';
import { TenantsCoreModule } from '../../tenants/module.js';

/**
 * Service accounts and API keys. It exports `IdentityApiKeyResolver`, which identity's verification uses to validate
 * keys in process, and its facade.
 */
@Module({
  imports: [
    AccessCoreModule,
    AuthenticationModule,
    TenantsCoreModule,
    PersistenceModule.forFeature({
      entities: [ServiceAccountEntity, ApiKeyEntity],
      sharding: { key: ShardKey.Tenant },
    }),
    PersistenceModule.forFeature({
      entities: [ApiKeyLookupEntity],
      catalog: true,
    }),
  ],
  controllers: [ApiKeysController],
  providers: [
    { provide: ApiKeyRepository, useClass: TypeOrmApiKeyRepository },
    { provide: ApiKeyDirectory, useClass: TypeOrmApiKeyDirectory },
    { provide: ApiKeysFacade, useClass: LocalApiKeysFacade },
    { provide: ApiKeySecretHasher, useClass: HmacApiKeySecretHasher },
    { provide: ApiKeyUsageBuffer, useClass: EphemeralApiKeyUsageBuffer },
    FlushApiKeyUsageJob,
    GrantablePermissions,
    ManageServiceAccounts,
    ManageApiKeys,
    AuthenticateApiKey,
    IdentityApiKeyResolver,
    ApiKeysInternalOperations,
  ],
  exports: [IdentityApiKeyResolver, ApiKeysFacade],
})
export class ApiKeysModule {}
