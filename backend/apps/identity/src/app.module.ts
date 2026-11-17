import { Module } from '@nestjs/common';
import { identityContract } from '@contracts/identity';
import { HttpModule } from '@platform/http/nest';
import { IdentityAuthModule } from './auth/identity-auth.module.js';
import { IdentityEphemeralModule } from './ephemeral/identity-ephemeral.module.js';
import { IdentitySecurityModule } from './security/identity-security.module.js';
import { IdentityConsumersModule } from './messaging/identity.consumers.js';
import { IDENTITY_ERROR_CATALOGS } from './shared/constants/identity-error-catalogs.constants.js';
import { IdentitySharedModule } from './shared/identity-shared.module.js';
import { AccessModule } from './modules/access/presentation/access.module.js';
import { AlertsModule } from './modules/alerts/presentation/alerts.module.js';
import { ApiKeysModule } from './modules/api-keys/presentation/api-keys.module.js';
import { AuthenticationModule } from './modules/authentication/presentation/authentication.module.js';
import { DevicesModule } from './modules/devices/presentation/devices.module.js';
import { InvitationsModule } from './modules/invitations/presentation/invitations.module.js';
import { MfaModule } from './modules/mfa/presentation/mfa.module.js';
import { PasskeysModule } from './modules/passkeys/presentation/passkeys.module.js';
import { PasswordsModule } from './modules/passwords/presentation/passwords.module.js';
import { SessionsModule } from './modules/sessions/presentation/sessions.module.js';
import { TenantsModule } from './modules/tenants/presentation/tenants.module.js';
import { TokensModule } from './modules/tokens/presentation/tokens.module.js';
import { UsersModule } from './modules/users/presentation/users.module.js';

@Module({
  imports: [
    IdentityAuthModule,
    IdentitySharedModule,
    IdentitySecurityModule,
    IdentityEphemeralModule,
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
