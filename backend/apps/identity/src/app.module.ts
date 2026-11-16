import { Module } from '@nestjs/common';
import { identityContract } from '@contracts/identity';
import { HttpModule } from '@platform/http/nest';
import { IdentityAuthModule } from './auth/identity-auth.module.js';
import { IdentityConsumersModule } from './messaging/identity.consumers.js';
import { IDENTITY_ERROR_CATALOGS } from './shared/constants/identity-error-catalogs.constants.js';
import { IdentitySharedModule } from './shared/identity-shared.module.js';
import { AccessModule } from './modules/access/index.js';
import { AlertsModule } from './modules/alerts/index.js';
import { ApiKeysModule } from './modules/api-keys/index.js';
import { AuthenticationModule } from './modules/authentication/index.js';
import { DevicesModule } from './modules/devices/index.js';
import { InvitationsModule } from './modules/invitations/index.js';
import { MfaModule } from './modules/mfa/index.js';
import { PasskeysModule } from './modules/passkeys/index.js';
import { PasswordsModule } from './modules/passwords/index.js';
import { SessionsModule } from './modules/sessions/index.js';
import { TenantsModule } from './modules/tenants/index.js';
import { TokensModule } from './modules/tokens/index.js';
import { UsersModule } from './modules/users/index.js';

@Module({
  imports: [
    IdentityAuthModule,
    IdentitySharedModule,
    HttpModule.forRoot({
      contract: identityContract,
      catalogs: IDENTITY_ERROR_CATALOGS,
    }),
    IdentityConsumersModule,
    UsersModule,
    PasswordsModule,
    AuthenticationModule,
    DevicesModule,
    MfaModule,
    PasskeysModule,
    SessionsModule,
    TokensModule,
    TenantsModule,
    AccessModule,
    InvitationsModule,
    ApiKeysModule,
    AlertsModule,
  ],
})
export class AppModule {}
