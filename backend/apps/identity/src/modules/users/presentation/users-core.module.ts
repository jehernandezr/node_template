import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { LocalUsersFacade } from '../application/local-users.facade.js';
import { SetLastTenant } from '../application/set-last-tenant.use-case.js';
import { UserReader } from '../application/user-reader.js';
import { UserRegistrar } from '../application/user-registrar.js';
import { UsersFacade } from '../application/users.facade.js';
import { EmailFingerprinter } from '../domain/email-fingerprinter.js';
import { UserDirectory } from '../domain/user-directory.js';
import { UserRepository } from '../domain/user.repository.js';
import { HmacEmailFingerprinter } from '../infrastructure/hmac-email-fingerprinter.js';
import { IdentityLookupEntity } from '../infrastructure/persistence/entities/identity-lookup.entity.js';
import { UserEntity } from '../infrastructure/persistence/entities/user.entity.js';
import { TypeOrmUserDirectory } from '../infrastructure/persistence/typeorm-user-directory.js';
import { TypeOrmUserRepository } from '../infrastructure/persistence/typeorm-user.repository.js';
import { PasswordsCoreModule } from '../../passwords/module.js';

/**
 * The part of `Users` other modules depend on: its facade and what the facade needs, with the repositories and services its entry module also uses.
 */
@Module({
  imports: [
    PasswordsCoreModule,
    PersistenceModule.forFeature({
      entities: [UserEntity],
      sharding: { key: ShardKey.User },
    }),
    PersistenceModule.forFeature({
      entities: [IdentityLookupEntity],
      catalog: true,
    }),
  ],
  providers: [
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    { provide: UserDirectory, useClass: TypeOrmUserDirectory },
    { provide: EmailFingerprinter, useClass: HmacEmailFingerprinter },
    UserReader,
    UserRegistrar,
    SetLastTenant,
    { provide: UsersFacade, useClass: LocalUsersFacade },
  ],
  exports: [
    UserRepository,
    UserDirectory,
    EmailFingerprinter,
    UserReader,
    UserRegistrar,
    SetLastTenant,
    UsersFacade,
  ],
})
export class UsersCoreModule {}
