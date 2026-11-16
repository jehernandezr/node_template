import { Global, Module } from '@nestjs/common';
import { AuthStateWriter } from '@platform/auth';
import { ValkeyAuthStateWriter } from '@platform/adapters-valkey';
import { AccessFacadeGrantSource } from './access-facade-grant-source.js';

/** Piezas de identity que `AuthModule` necesita y que no vienen de la plataforma. */
@Global()
@Module({
  providers: [
    AccessFacadeGrantSource,
    { provide: AuthStateWriter, useExisting: ValkeyAuthStateWriter },
  ],
  exports: [AccessFacadeGrantSource, AuthStateWriter],
})
export class IdentityAuthSupportModule {}
