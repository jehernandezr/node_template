import { Global, Module } from '@nestjs/common';
import { SmokeTenantVerifier } from './orders/smoke-tenant-verifier.js';

/**
 * Verificador de tenants del consumidor. `MessagingModule` lo recibe por `useExisting`, así que vive en un
 * módulo global, igual que los adaptadores de la plataforma.
 */
@Global()
@Module({
  providers: [SmokeTenantVerifier],
  exports: [SmokeTenantVerifier],
})
export class SmokeTenancyModule {}
