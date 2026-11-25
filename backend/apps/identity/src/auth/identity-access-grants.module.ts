import { Module } from '@nestjs/common';
import { AccessCoreModule } from '../modules/access/module.js';
import { ApiKeysModule } from '../modules/api-keys/module.js';
import { AccessFacadeGrantSource } from './access-facade-grant-source.js';

/**
 * What `AuthModule` needs from identity's business modules: the access computed by `access` and the API keys resolved
 * by `api-keys`, both in process.
 */
@Module({
  imports: [AccessCoreModule, ApiKeysModule],
  providers: [AccessFacadeGrantSource],
  exports: [AccessFacadeGrantSource, ApiKeysModule],
})
export class IdentityAccessGrantsModule {}
