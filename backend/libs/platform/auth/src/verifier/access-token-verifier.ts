import type { KeyObject } from 'node:crypto';
import {
  AccessTokenClaimsSchema,
  type AccessTokenClaims,
} from '@contracts/identity';
import { ActorType } from '@platform/observability';
import type { Clock } from '@platform/kernel';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { UserActor } from '../actor/actor.js';
import type { AccessResolver } from '../access/access-resolver.js';
import { AccessTokenFormat } from '../jwt/access-token-format.js';
import { JwtAlgorithm } from '../jwt/jwt-algorithm.enum.js';
import { JwtCodec } from '../jwt/jwt-codec.js';
import type { ParsedJwt } from '../jwt/parsed-jwt.js';
import type { JwksKeySource } from '../jwks/jwks-key-source.js';
import type { AuthStateReader } from '../state/auth-state-reader.js';
import type { Epoch } from '../state/epoch.js';
import type { PermissionVersion } from '../state/permission-version.js';
import { PermissionVersionCodec } from '../state/permission-version-codec.js';
import type { VerifyOptions } from './verify-options.js';

/**
 * Verifies an access token and builds the `UserActor`, without calling identity. Checks
 * in this order and stops at the first failure:
 *
 * | Step | Check | Error |
 * | 1 | Maximum length, three parts, `alg` ES256, `typ` at+jwt, no `crit` | `unauthenticated` |
 * | 2 | Known `kid` and ES256 signature | `unauthenticated` |
 * | 3 | Valid claims (`AccessTokenClaimsSchema`), `iss` and `aud` | `unauthenticated` |
 * | 4 | `exp` expired with 30 s tolerance; `iat` more than 30 s in the future | `tokenExpired`; `unauthenticated` |
 * | 5 | `sxp` expired | `sessionExpired` |
 * | 6 | `sid` revoked | `sessionRevoked` |
 * | 7 | User epoch: suspended, then `iat` less than `revokedBefore` | `userSuspended`; `tokenRevoked` |
 * | 8 | Epoch of tenant `tid`: suspended, then `iat` less than `revokedBefore` | `tenantSuspended`; `tokenRevoked` |
 * | 9 | `pv` older than the current one (`AuthStateReader.permissionVersion`, or `AccessResolver` if missing) | `stalePermissions` |
 *
 * In step 9 a `pv` newer than the current one is accepted: versions only go up
 * and the local cache may lag identity by a few seconds; rejecting it would make a
 * token just issued after a permission change fail in a loop until the cache
 * expires. It is older if its tenant version or its user version is less than the current one.
 *
 * Any failure of `AuthStateReader`, `AccessResolver` or `JwksKeySource` that is not
 * an `AuthenticationError` is translated to `AuthenticationError.stateUnavailable`.
 */
export class AccessTokenVerifier {
  constructor(
    private readonly keys: JwksKeySource,
    private readonly state: AuthStateReader,
    private readonly access: AccessResolver,
    private readonly clock: Clock,
    private readonly issuer: string,
  ) {}

  /**
   * Verifies an access token and its revocation, suspension and permissions version.
   * @param token Compact JWT.
   * @param options Audience and checks of the route.
   * @returns The user actor.
   * @throws AuthenticationError with the code of the step that failed.
   */
  async verify(token: string, options: VerifyOptions): Promise<UserActor> {
    const parsed = this.parseToken(token);
    await this.checkSignature(parsed);
    const claims = this.readClaims(parsed, options);
    this.checkLifetime(claims);
    await this.checkSession(claims);
    await this.checkEpochs(claims);
    await this.checkPermissionVersion(claims);
    return this.toActor(claims);
  }

  /** Step 1: size, compact format and header. */
  private parseToken(token: string): ParsedJwt {
    if (token.length > AccessTokenFormat.MAX_LENGTH) {
      throw AuthenticationError.unauthenticated('token too long');
    }
    const parsed = JwtCodec.parse(token);
    const { alg, typ } = parsed.header;
    if (alg !== JwtAlgorithm.Es256) {
      throw AuthenticationError.unauthenticated('unsupported alg');
    }
    if (typ !== AccessTokenFormat.TYPE) {
      throw AuthenticationError.unauthenticated('unsupported typ');
    }
    if ('crit' in parsed.header) {
      throw AuthenticationError.unauthenticated('crit not supported');
    }
    return parsed;
  }

  /** Step 2: the `kid` has a published key and the ES256 signature matches. */
  private async checkSignature(parsed: ParsedJwt): Promise<void> {
    const key = await this.keyFor(parsed.header.kid);
    if (!JwtCodec.verifySignature(parsed, key)) {
      throw AuthenticationError.unauthenticated('bad signature');
    }
  }

  private async keyFor(kid: unknown): Promise<KeyObject> {
    if (
      typeof kid !== 'string' ||
      kid.length < 1 ||
      kid.length > AccessTokenFormat.MAX_KID_LENGTH
    ) {
      throw AuthenticationError.unauthenticated('invalid kid');
    }
    const key = await this.guarded(() => this.keys.keyFor(kid));
    if (key === undefined) {
      throw AuthenticationError.unauthenticated('unknown key');
    }
    return key;
  }

  /** Step 3: claims shape, issuer and audience. */
  private readClaims(
    parsed: ParsedJwt,
    options: VerifyOptions,
  ): AccessTokenClaims {
    const result = AccessTokenClaimsSchema.safeParse(parsed.claims);
    if (!result.success) {
      throw AuthenticationError.unauthenticated('invalid claims');
    }
    const claims = result.data;
    if (claims.iss !== this.issuer) {
      throw AuthenticationError.unauthenticated('unexpected issuer');
    }
    if (claims.aud !== options.audience) {
      throw AuthenticationError.unauthenticated('unexpected audience');
    }
    return claims;
  }

  /** Steps 4 and 5: token expiry with tolerance and absolute session cap. */
  private checkLifetime(claims: AccessTokenClaims): void {
    const nowMs = this.clock.now().getTime();
    if (claims.exp * 1000 + AccessTokenFormat.CLOCK_SKEW_MS <= nowMs) {
      throw AuthenticationError.tokenExpired();
    }
    if (claims.iat * 1000 - AccessTokenFormat.CLOCK_SKEW_MS > nowMs) {
      throw AuthenticationError.unauthenticated('issued in the future');
    }
    if (claims.sxp * 1000 <= nowMs) {
      throw AuthenticationError.sessionExpired();
    }
  }

  /** Step 6: revoked session. */
  private async checkSession(claims: AccessTokenClaims): Promise<void> {
    const revoked = await this.guarded(() =>
      this.state.isSessionRevoked(claims.sid),
    );
    if (revoked) {
      throw AuthenticationError.sessionRevoked();
    }
  }

  /** Steps 7 and 8: user epoch and then that of the active tenant. */
  private async checkEpochs(claims: AccessTokenClaims): Promise<void> {
    const userEpoch = await this.guarded(() =>
      this.state.userEpoch(claims.sub),
    );
    if (userEpoch?.suspended === true) {
      throw AuthenticationError.userSuspended();
    }
    this.checkRevokedBefore(userEpoch, claims.iat);

    const tenantEpoch = await this.guarded(() =>
      this.state.tenantEpoch(claims.tid),
    );
    if (tenantEpoch?.suspended === true) {
      throw AuthenticationError.tenantSuspended();
    }
    this.checkRevokedBefore(tenantEpoch, claims.iat);
  }

  private checkRevokedBefore(epoch: Epoch | undefined, iat: number): void {
    if (epoch !== undefined && iat < epoch.revokedBefore) {
      throw AuthenticationError.tokenRevoked();
    }
  }

  /** Step 9: the token's `pv` is not older than the current version. */
  private async checkPermissionVersion(
    claims: AccessTokenClaims,
  ): Promise<void> {
    const tokenVersion = PermissionVersionCodec.parse(claims.pv);
    if (tokenVersion === undefined) {
      throw AuthenticationError.unauthenticated('invalid claims');
    }
    const current = await this.currentPermissionVersion(claims.tid, claims.sub);
    if (
      tokenVersion.tenant < current.tenant ||
      tokenVersion.user < current.user
    ) {
      throw AuthenticationError.stalePermissions();
    }
  }

  /** Current version: the one from the state cache or, if missing, the one the grant carries. */
  private async currentPermissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion> {
    const stored = await this.guarded(() =>
      this.state.permissionVersion(tenantId, userId),
    );
    if (stored !== undefined) {
      return stored;
    }
    const grant = await this.guarded(() =>
      this.access.resolve(tenantId, userId),
    );
    const version = PermissionVersionCodec.parse(grant.permissionVersion);
    if (version === undefined) {
      throw AuthenticationError.stateUnavailable(
        new Error('invalid permission version in grant'),
      );
    }
    return version;
  }

  private toActor(claims: AccessTokenClaims): UserActor {
    return {
      kind: ActorType.User,
      userId: claims.sub,
      tenantId: claims.tid,
      homeTenantId: claims.htid,
      sessionId: claims.sid,
      ...(claims.did === undefined ? {} : { deviceId: claims.did }),
      audience: claims.aud,
      authMethods: claims.amr,
      authTime: claims.auth_time,
      roles: claims.roles,
      platformRoles: claims.proles,
      permissionVersion: claims.pv,
      region: claims.rgn,
      sessionExpiresAt: claims.sxp,
      tokenId: claims.jti,
    };
  }

  /** Translates any dependency failure into `stateUnavailable`, except those that are already authentication failures. */
  private async guarded<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw AuthenticationError.stateUnavailable(error);
    }
  }
}
