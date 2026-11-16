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
 * Verifica un access token y arma el `UserActor`, sin llamar a identity. Revisa
 * en este orden y se detiene en el primer fallo:
 *
 * | Paso | Revisión | Error |
 * | 1 | Largo máximo, tres partes, `alg` ES256, `typ` at+jwt, sin `crit` | `unauthenticated` |
 * | 2 | `kid` conocido y firma ES256 | `unauthenticated` |
 * | 3 | Claims válidos (`AccessTokenClaimsSchema`), `iss` y `aud` | `unauthenticated` |
 * | 4 | `exp` vencido con 30 s de tolerancia; `iat` más de 30 s en el futuro | `tokenExpired`; `unauthenticated` |
 * | 5 | `sxp` vencido | `sessionExpired` |
 * | 6 | `sid` revocado | `sessionRevoked` |
 * | 7 | Época del usuario: suspendido, luego `iat` menor que `revokedBefore` | `userSuspended`; `tokenRevoked` |
 * | 8 | Época del tenant `tid`: suspendido, luego `iat` menor que `revokedBefore` | `tenantSuspended`; `tokenRevoked` |
 * | 9 | `pv` anterior al vigente (`AuthStateReader.permissionVersion`, o `AccessResolver` si falta) | `stalePermissions` |
 *
 * En el paso 9 un `pv` más nuevo que el vigente se acepta: las versiones solo suben
 * y la caché local puede ir unos segundos atrás de identity; rechazarlo haría que un
 * token recién emitido tras un cambio de permisos fallara en bucle hasta que la caché
 * venza. Es anterior si su versión de tenant o la de usuario es menor que la vigente.
 *
 * Todo fallo de `AuthStateReader`, `AccessResolver` o `JwksKeySource` que no sea
 * un `AuthenticationError` se traduce a `AuthenticationError.stateUnavailable`.
 */
export class AccessTokenVerifier {
  constructor(
    private readonly keys: JwksKeySource,
    private readonly state: AuthStateReader,
    private readonly access: AccessResolver,
    private readonly clock: Clock,
    private readonly issuer: string,
  ) {}

  /** @throws AuthenticationError con el código del paso que falló. */
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

  /** Paso 1: tamaño, formato compacto y header. */
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

  /** Paso 2: el `kid` tiene clave publicada y la firma ES256 corresponde. */
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

  /** Paso 3: forma de los claims, emisor y audiencia. */
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

  /** Pasos 4 y 5: vencimiento del token con tolerancia y tope absoluto de la sesión. */
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

  /** Paso 6: sesión revocada. */
  private async checkSession(claims: AccessTokenClaims): Promise<void> {
    const revoked = await this.guarded(() =>
      this.state.isSessionRevoked(claims.sid),
    );
    if (revoked) {
      throw AuthenticationError.sessionRevoked();
    }
  }

  /** Pasos 7 y 8: época del usuario y luego la del tenant activo. */
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

  /** Paso 9: el `pv` del token no es anterior a la versión vigente. */
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

  /** Versión vigente: la de la caché de estado o, si falta, la que trae el grant. */
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

  /** Traduce cualquier falla de una dependencia en `stateUnavailable`, salvo las que ya son de autenticación. */
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
