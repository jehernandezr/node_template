import { Global, Module } from '@nestjs/common';
import {
  ValkeyAuthRevocationFeed,
  ValkeyAuthStateReader,
} from '@platform/adapters-valkey';
import { AuthModule } from '@platform/auth/nest';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { InternalAccessGrantSource } from '../../auth/internal-access-grant-source.js';

/** Fuente del acceso por la API interna de identity, global para que `AuthModule` la encuentre. */
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
 * Verificación de tokens para un servicio que no es identity: los tokens se verifican en local con el JWKS
 * de identity y el estado compartido en Valkey, y el acceso de un usuario se pide a identity por la API
 * interna cuando no está en la copia compartida. El servicio declara `identityContract` en `peerContracts`.
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
