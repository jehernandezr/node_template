import { Module } from '@nestjs/common';
import { SeedSmokeAccount } from './seed-smoke-account.js';
import { SmokeTenants } from './smoke-tenants.js';
import { RegionSmokeTenants } from './region-smoke-tenants.js';
import { DevicesCoreModule } from '../modules/devices/module.js';
import { MfaModule } from '../modules/mfa/module.js';
import { PasswordsCoreModule } from '../modules/passwords/module.js';
import { SessionsModule } from '../modules/sessions/module.js';
import { TenantsModule } from '../modules/tenants/presentation/tenants.module.js';
import { UsersCoreModule } from '../modules/users/module.js';

/** The smoke account the region seed creates outside production for the deploy smoke tests. */
@Module({
  imports: [
    UsersCoreModule,
    PasswordsCoreModule,
    MfaModule,
    DevicesCoreModule,
    SessionsModule,
    TenantsModule,
  ],
  providers: [
    { provide: SmokeTenants, useClass: RegionSmokeTenants },
    SeedSmokeAccount,
  ],
})
export class SmokeAccountModule {}
