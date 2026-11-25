import { Global, Module } from '@nestjs/common';
import {
  ValkeyAuthRevocationFeed,
  ValkeyAuthStateReader,
} from '@platform/adapters-valkey';
import { AuthModule } from '@platform/auth/nest';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { InternalAccessGrantSource } from '../../auth/internal-access-grant-source.js';

/** Access source through the identity internal API, global so that `AuthModule` finds it. */
@Global()
@Module({
  providers: [
    {
      provide: InternalAccessGrantSource,
      useFactory: (client: InternalClient, ids: IdGenerator) =>
        new InternalAccessGrantSource(client, ids),
      inject: [InternalClient, IdGenerator],
    },
  ],
  exports: [InternalAccessGrantSource],
})
class InternalAccessGrantModule {}

/**
 * Token verification for a service that is not identity: tokens are verified locally with the identity JWKS
 * and the shared state in Valkey, and a user's access is requested from identity through the internal
 * API when it is not in the shared copy. The service declares `identityContract` in `peerContracts`.
 */
@Module({
  imports: [
    InternalAccessGrantModule,
    AuthModule.forRoot({
      source: ValkeyAuthStateReader,
      feed: ValkeyAuthRevocationFeed,
      accessGrants: InternalAccessGrantSource,
    }),
  ],
})
export class RemoteIdentityAuthModule {}
