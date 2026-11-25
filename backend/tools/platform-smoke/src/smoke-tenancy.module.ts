import { Global, Module } from '@nestjs/common';
import { SmokeTenantVerifier } from './orders/smoke-tenant-verifier.js';

/**
 * Consumer tenant verifier. `MessagingModule` receives it through `useExisting`, so it lives in a
 * global module, like the platform adapters.
 */
@Global()
@Module({
  providers: [SmokeTenantVerifier],
  exports: [SmokeTenantVerifier],
})
export class SmokeTenancyModule {}
