import { Injectable } from '@nestjs/common';
import {
  TokenAudience,
  AccessTokenClaims,
  UserAccess,
} from '@contracts/identity';
import { AccessTokenFormat, JwtCodec, AuthStateWriter } from '@platform/auth';
import { Clock, IdGenerator, UseCase } from '@platform/kernel';
import { AccessFacade } from '../../access/index.js';
import { AccessTokenInput } from '../domain/access-token-input.js';
import { SigningKeyProvider } from '../domain/signing-key-provider.js';
import { IdentitySettings } from '../../../config/identity-settings.js';

/** Signed access token and when it expires. */
export interface IssuedAccessToken {
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
}

/**
 * Signs an access token with the user's current access in the active tenant. Before signing it stores the
 * `AccessGrant` in `auth:access:*`, so the other services do not have to ask identity for it.
 */
@Injectable()
export class IssueAccessToken implements UseCase<
  AccessTokenInput,
  IssuedAccessToken
> {
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly keys: SigningKeyProvider,
    private readonly access: AccessFacade,
    private readonly state: AuthStateWriter,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly settings: IdentitySettings,
  ) {}

  async execute(input: AccessTokenInput): Promise<IssuedAccessToken> {
    const access = await this.access.resolve(input.userId, input.tenantId);
    await this.state.putAccessGrant(input.tenantId, input.userId, {
      permissions: access.permissions,
      platformRoles: access.platformRoles,
      features: access.features,
      flags: access.flags,
      permissionVersion: access.permissionVersion,
    });
    const now = this.clock.now().getTime();
    const expiresAt = now + this.settings.values.ACCESS_TOKEN_TTL;
    const key = this.keys.ring().active();
    const claims = this.claimsFor(input, access, now, expiresAt);
    return {
      accessToken: JwtCodec.sign(
        { alg: 'ES256', typ: AccessTokenFormat.TYPE, kid: key.kid },
        claims,
        key.privateKey,
      ),
      accessExpiresAt: new Date(expiresAt),
    };
  }

  private claimsFor(
    input: AccessTokenInput,
    access: UserAccess,
    now: number,
    expiresAt: number,
  ): AccessTokenClaims {
    return {
      iss: this.settings.values.IDENTITY_ISSUER,
      aud: TokenAudience.Api,
      sub: input.userId,
      tid: input.tenantId,
      htid: input.homeTenantId,
      sid: input.sessionId,
      ...(input.deviceId === undefined ? {} : { did: input.deviceId }),
      amr: [...input.authMethods],
      auth_time: this.seconds(input.authTime.getTime()),
      roles: [...access.roles],
      proles: [...access.platformRoles],
      pv: access.permissionVersion,
      rgn: this.settings.values.IDENTITY_REGION,
      sxp: this.seconds(input.sessionExpiresAt.getTime()),
      iat: this.seconds(now),
      exp: this.seconds(expiresAt),
      jti: this.ids.next().toString(),
    };
  }

  private seconds(ms: number): number {
    return Math.floor(ms / IssueAccessToken.SECOND_MS);
  }
}
