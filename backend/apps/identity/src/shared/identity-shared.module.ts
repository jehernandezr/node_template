import { Global, Module } from '@nestjs/common';
import { IdentityShardScopes } from './utils/identity-shard-scopes.js';

/** Servicios compartidos por todos los módulos de identity. */
@Global()
@Module({
  providers: [IdentityShardScopes],
  exports: [IdentityShardScopes],
})
export class IdentitySharedModule {}
