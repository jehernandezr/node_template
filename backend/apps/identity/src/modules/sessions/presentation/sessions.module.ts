import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { CreateSession } from '../application/create-session.use-case.js';
import { FindSession } from '../application/find-session.use-case.js';
import { ListMySessions } from '../application/list-my-sessions.use-case.js';
import { LocalSessionsFacade } from '../application/local-sessions.facade.js';
import { MarkMfaVerified } from '../application/mark-mfa-verified.use-case.js';
import { RefreshSession } from '../application/refresh-session.use-case.js';
import { RevocationReplay } from '../application/revocation-replay.js';
import { RevokeSessions } from '../application/revoke-sessions.use-case.js';
import { SessionRevoker } from '../application/session-revoker.js';
import { SessionTokenIssuer } from '../application/session-token-issuer.js';
import { SessionsFacade } from '../application/sessions.facade.js';
import { SignOut } from '../application/sign-out.use-case.js';
import { SwitchTenant } from '../application/switch-tenant.use-case.js';
import { SessionRepository } from '../domain/session.repository.js';
import { SessionEntity } from '../infrastructure/persistence/entities/session.entity.js';
import { TypeOrmSessionRepository } from '../infrastructure/persistence/typeorm-session.repository.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsInternalOperations } from './sessions.internal-operations.js';

import { AccessCoreModule } from '../../access/module.js';
import { TenantsCoreModule } from '../../tenants/module.js';
import { TokensModule } from '../../tokens/module.js';
import { UsersCoreModule } from '../../users/module.js';

/** Sessions, rotation, refresh, sign-out, revocation and tenant switch. */
@Module({
  imports: [
    AccessCoreModule,
    TenantsCoreModule,
    TokensModule,
    UsersCoreModule,
    PersistenceModule.forFeature({
      entities: [SessionEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  controllers: [SessionsController],
  providers: [
    { provide: SessionRepository, useClass: TypeOrmSessionRepository },
    SessionTokenIssuer,
    SessionRevoker,
    CreateSession,
    RefreshSession,
    SignOut,
    ListMySessions,
    FindSession,
    RevokeSessions,
    SwitchTenant,
    MarkMfaVerified,
    RevocationReplay,
    { provide: SessionsFacade, useClass: LocalSessionsFacade },
    SessionsInternalOperations,
  ],
  exports: [SessionsFacade],
})
export class SessionsModule {}
