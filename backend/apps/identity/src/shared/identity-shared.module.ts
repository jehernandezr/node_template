import { Global, Module } from '@nestjs/common';
import { IdentityShardScopes } from './utils/identity-shard-scopes.js';
import { SessionDelivery } from './utils/session-delivery.js';

/** Servicios compartidos por todos los módulos de identity. */
@Global()
@Module({
  providers: [IdentityShardScopes, SessionDelivery],
  exports: [IdentityShardScopes, SessionDelivery],
})
export class IdentitySharedModule {}
