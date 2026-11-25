import type { Type } from '@nestjs/common';
import {
  GLOBAL_MODULE_METADATA,
  MODULE_METADATA,
} from '@nestjs/common/constants.js';
import { AccessModule } from '../modules/access/presentation/access.module.js';
import { AccessCoreModule } from '../modules/access/presentation/access-core.module.js';
import { AlertsModule } from '../modules/alerts/presentation/alerts.module.js';
import { ApiKeysModule } from '../modules/api-keys/presentation/api-keys.module.js';
import { AuthenticationModule } from '../modules/authentication/presentation/authentication.module.js';
import { DevicesModule } from '../modules/devices/presentation/devices.module.js';
import { DevicesCoreModule } from '../modules/devices/presentation/devices-core.module.js';
import { InvitationsModule } from '../modules/invitations/presentation/invitations.module.js';
import { MfaModule } from '../modules/mfa/presentation/mfa.module.js';
import { PasskeysModule } from '../modules/passkeys/presentation/passkeys.module.js';
import { PasskeysCoreModule } from '../modules/passkeys/presentation/passkeys-core.module.js';
import { PasswordsModule } from '../modules/passwords/presentation/passwords.module.js';
import { PasswordsCoreModule } from '../modules/passwords/presentation/passwords-core.module.js';
import { SagasModule } from '../modules/sagas/presentation/sagas.module.js';
import { SessionsModule } from '../modules/sessions/presentation/sessions.module.js';
import { TenantMovesModule } from '../modules/tenant-moves/presentation/tenant-moves.module.js';
import { TenantMovesCoreModule } from '../modules/tenant-moves/presentation/tenant-moves-core.module.js';
import { TenantsModule } from '../modules/tenants/presentation/tenants.module.js';
import { TenantsCoreModule } from '../modules/tenants/presentation/tenants-core.module.js';
import { TokensModule } from '../modules/tokens/presentation/tokens.module.js';
import { UsersModule } from '../modules/users/presentation/users.module.js';
import { UsersCoreModule } from '../modules/users/presentation/users-core.module.js';

const BUSINESS_MODULES: readonly Type<unknown>[] = [
  AccessModule,
  AccessCoreModule,
  AlertsModule,
  ApiKeysModule,
  AuthenticationModule,
  DevicesModule,
  DevicesCoreModule,
  InvitationsModule,
  MfaModule,
  PasskeysModule,
  PasskeysCoreModule,
  PasswordsModule,
  PasswordsCoreModule,
  SagasModule,
  SessionsModule,
  TenantMovesModule,
  TenantMovesCoreModule,
  TenantsModule,
  TenantsCoreModule,
  TokensModule,
  UsersModule,
  UsersCoreModule,
];

const CORE_MODULES: readonly Type<unknown>[] = [
  AccessCoreModule,
  DevicesCoreModule,
  PasskeysCoreModule,
  PasswordsCoreModule,
  TenantMovesCoreModule,
  TenantsCoreModule,
  UsersCoreModule,
];

/** The identity business modules a module imports, ignoring platform and dynamic modules. */
const businessImportsOf = (module: Type<unknown>): Type<unknown>[] =>
  (
    (Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) as
      unknown[] | undefined) ?? []
  ).filter((entry): entry is Type<unknown> =>
    BUSINESS_MODULES.includes(entry as Type<unknown>),
  );

describe('identity business modules', () => {
  it('are not global: each one imports the modules whose facades it uses', () => {
    const globals = BUSINESS_MODULES.filter(
      (module) => Reflect.getMetadata(GLOBAL_MODULE_METADATA, module) === true,
    );

    expect(globals.map((module) => module.name)).toEqual([]);
  });

  it('keep the core modules importing only other core modules or the alerts', () => {
    const crossings = CORE_MODULES.flatMap((module) =>
      businessImportsOf(module)
        .filter(
          (imported) =>
            !CORE_MODULES.includes(imported) && imported !== AlertsModule,
        )
        .map((imported) => `${module.name} -> ${imported.name}`),
    );

    expect(crossings).toEqual([]);
  });
});
