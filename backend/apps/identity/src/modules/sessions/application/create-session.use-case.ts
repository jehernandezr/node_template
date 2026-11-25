import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import { Clock, IdGenerator, UseCase } from '@platform/kernel';
import {
  deviceNameFrom,
  platformFromUserAgent,
} from '../../../shared/utils/client-platform.js';
import { AccessFacade } from '../../access/index.js';
import { TenantsFacade } from '../../tenants/index.js';
import { UsersFacade } from '../../users/index.js';
import { CreateSessionInput } from '../domain/create-session-input.js';
import { IssuedSession } from '../domain/issued-session.js';
import { SessionRepository } from '../domain/session.repository.js';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { Session } from '../domain/session.js';
import { SessionTokenIssuer } from './session-token-issuer.js';

/**
 * Opens a session in the requested tenant, in the last one the user used if they are still a member, or in their
 * default tenant. The row is written in the user's shard; the access token is signed afterwards.
 */
@Injectable()
export class CreateSession implements UseCase<
  CreateSessionInput,
  IssuedSession
> {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly issuer: SessionTokenIssuer,
    private readonly users: UsersFacade,
    private readonly access: AccessFacade,
    private readonly tenants: TenantsFacade,
    private readonly scopes: ShardScopes,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  async execute(input: CreateSessionInput): Promise<IssuedSession> {
    const tenantId = await this.tenantFor(input);
    await this.tenants.assertActive(tenantId);
    const now = this.clock.now();
    const absoluteExpiresAt = new Date(
      now.getTime() + this.settings.values.SESSION_ABSOLUTE_TTL,
    );
    const session = Session.open({
      id: this.ids.next().toString(),
      userId: input.user.userId,
      homeTenantId: input.user.homeTenantId,
      activeTenantId: tenantId,
      ...(input.deviceId === undefined ? {} : { deviceId: input.deviceId }),
      deviceName: deviceNameFrom(input.client.userAgent),
      platform: platformFromUserAgent(input.client.userAgent),
      tokenSalt: this.issuer.newSalt(),
      generation: Session.FIRST_GENERATION,
      amr: [...new Set(input.authMethods)],
      authTime: input.authTime,
      ...(input.mfaVerifiedAt === undefined
        ? {}
        : { mfaVerifiedAt: input.mfaVerifiedAt }),
      idleExpiresAt: new Date(
        Math.min(
          now.getTime() + this.settings.values.SESSION_IDLE_TTL,
          absoluteExpiresAt.getTime(),
        ),
      ),
      absoluteExpiresAt,
      lastRefreshAt: now,
      ip: input.client.ip,
      ...(input.client.userAgent === undefined
        ? {}
        : { userAgent: input.client.userAgent }),
    });
    await this.scopes.inUserShard(input.user, () =>
      this.sessions.insert(session),
    );
    await this.users.setLastTenant(input.user, tenantId);
    const access = await this.issuer.accessToken(session);
    return {
      sessionId: session.id,
      accessToken: access.accessToken,
      accessExpiresAt: access.accessExpiresAt,
      sessionToken: this.issuer.sessionToken(session),
      sessionExpiresAt: absoluteExpiresAt,
    };
  }

  private async tenantFor(input: CreateSessionInput): Promise<string> {
    if (input.tenantId !== undefined) {
      return input.tenantId;
    }
    const user = await this.users.getByRef(input.user);
    if (
      user.lastTenantId !== undefined &&
      (await this.access.isMember(user.id, user.lastTenantId))
    ) {
      return user.lastTenantId;
    }
    return this.access.defaultTenant(input.user);
  }
}
