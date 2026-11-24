import { Global, Module } from '@nestjs/common';
import { DeploymentRegion } from './utils/deployment-region.js';
import { IdentityShardScopes } from './utils/identity-shard-scopes.js';
import { SessionDelivery } from './utils/session-delivery.js';

/** Servicios compartidos por todos los módulos de identity. */
@Global()
@Module({
  providers: [IdentityShardScopes, SessionDelivery, DeploymentRegion],
  exports: [IdentityShardScopes, SessionDelivery, DeploymentRegion],
})
export class IdentitySharedModule {}
