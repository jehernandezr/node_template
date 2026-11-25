import { ActingUser } from '@platform/auth';
import { Headers } from '@nestjs/common';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import { HttpProblemError, SessionCookieMode } from '@platform/http';
import type { Actor } from '@platform/auth';
import {
  RefreshSessionRoute,
  RevocationReason,
  SignOutRoute,
  ListSessionsRoute,
  RevokeSessionRoute,
  RevokeOtherSessionsRoute,
  SwitchTenantRoute,
  type RevokedSessions,
  type RevokeSessionRequest,
  type SessionPage,
  type SessionTokenRequest,
  type SessionTokens,
  type SwitchTenantRequest,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { sessionTokenFrom } from '../../../shared/utils/session-token-source.js';
import { ListMySessions } from '../application/list-my-sessions.use-case.js';
import { RefreshSession } from '../application/refresh-session.use-case.js';
import { RevokeSessions } from '../application/revoke-sessions.use-case.js';
import { SignOut } from '../application/sign-out.use-case.js';
import { SwitchTenant } from '../application/switch-tenant.use-case.js';

@Resource(IdentityResource.Sessions)
export class SessionsController {
  constructor(
    private readonly refresh: RefreshSession,
    private readonly signOutUseCase: SignOut,
    private readonly list: ListMySessions,
    private readonly revoke: RevokeSessions,
    private readonly switchTenantUseCase: SwitchTenant,
  ) {}

  @Endpoint(RefreshSessionRoute, { sessionCookie: SessionCookieMode.Rotate })
  refreshSession(
    @Input() input: SessionTokenRequest,
    @Headers('authorization') authorization?: string,
  ): Promise<SessionTokens> {
    return this.refresh.execute(
      sessionTokenFrom(input.sessionToken, authorization),
    );
  }

  @Endpoint(SignOutRoute, { sessionCookie: SessionCookieMode.Clear })
  async signOut(
    @Input() input: SessionTokenRequest,
    @Headers('authorization') authorization?: string,
  ): Promise<void> {
    await this.signOutUseCase.execute(
      sessionTokenFrom(input.sessionToken, authorization),
    );
  }

  @Endpoint(ListSessionsRoute)
  listSessions(@CurrentActor() actor: Actor | undefined): Promise<SessionPage> {
    return this.list.execute(ActingUser.of(actor));
  }

  @Endpoint(RevokeSessionRoute)
  async revokeSession(
    @Input() input: RevokeSessionRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    const user = ActingUser.of(actor);
    const revoked = await this.revoke.execute({
      user: ActingUser.refOf(user),
      reason: RevocationReason.UserAction,
      sessionId: input.sessionId,
    });
    if (revoked === 0) {
      throw HttpProblemError.notFound();
    }
  }

  @Endpoint(RevokeOtherSessionsRoute)
  async revokeOtherSessions(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<RevokedSessions> {
    const user = ActingUser.of(actor);
    const revoked = await this.revoke.execute({
      user: ActingUser.refOf(user),
      reason: RevocationReason.UserAction,
      except: user.sessionId,
    });
    return { revoked };
  }

  @Endpoint(SwitchTenantRoute)
  switchTenant(
    @Input() input: SwitchTenantRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<SessionTokens> {
    return this.switchTenantUseCase.execute({
      actor: ActingUser.of(actor),
      tenantId: input.tenantId,
    });
  }
}
