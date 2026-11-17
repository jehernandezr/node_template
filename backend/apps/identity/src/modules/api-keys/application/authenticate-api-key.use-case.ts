import { isDeepStrictEqual } from 'node:util';
import { Injectable } from '@nestjs/common';
import {
  ApiKeyEnvironment as ContractApiKeyEnvironment,
  IdentityErrorCode,
  ServiceAccountStatus,
  type ApiKeyPrincipal,
} from '@contracts/identity';
import {
  ApiKeyEnvironment,
  ApiKeyFormat,
  AuthStateWriter,
  type ApiKeyPrincipal as CachedApiKeyPrincipal,
} from '@platform/auth';
import { Clock } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { isIpInAnyCidr } from '../../../shared/utils/cidr.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { LockoutKeys, LoginLockout } from '../../authentication/index.js';
import { TenantsFacade } from '../../tenants/index.js';
import {
  ApiKeyDirectory,
  ApiKeyRepository,
  ApiKeySecretHasher,
} from '../domain/api-key-store.js';
import { ApiKeyUsageBuffer } from '../domain/api-key-usage-buffer.js';
import type { ApiKey } from '../domain/api-key.js';

/** Una key válida y lo que hace falta para dejar su copia en `auth:apikey:*`. */
interface Verified {
  readonly principal: ApiKeyPrincipal;
  readonly key: ApiKey;
}

/**
 * Valida una API key y devuelve su principal. La busca por prefijo en el catálogo, compara el HMAC del
 * secreto en el shard de su tenant y revisa vencimiento, rotación, IP y estado de la cuenta y del tenant.
 * Los fallos cuentan por prefijo e IP con las reglas de bloqueo del inicio de sesión, así el secreto de un
 * prefijo conocido no se puede adivinar probando.
 */
@Injectable()
export class AuthenticateApiKey {
  private static readonly SECOND_MS = 1000;

  constructor(
    private readonly directory: ApiKeyDirectory,
    private readonly repository: ApiKeyRepository,
    private readonly hasher: ApiKeySecretHasher,
    private readonly tenants: TenantsFacade,
    private readonly lockout: LoginLockout,
    private readonly lockoutKeys: LockoutKeys,
    private readonly usage: ApiKeyUsageBuffer,
    private readonly state: AuthStateWriter,
    private readonly scopes: IdentityShardScopes,
    private readonly clock: Clock,
  ) {}

  /** Con la key completa, como la recibe la operación interna. */
  async execute(rawKey: string, clientIp?: string): Promise<ApiKeyPrincipal> {
    const parsed = ApiKeyFormat.parse(rawKey);
    if (parsed === undefined) {
      throw new IdentityError(IdentityErrorCode.ApiKeyInvalid);
    }
    return this.resolve(
      parsed.prefix,
      ApiKeyFormat.hashSecret(parsed.secret),
      clientIp,
    );
  }

  /**
   * Con el prefijo y el SHA-256 del secreto, como lo resuelve `@platform/auth`.
   * @throws IdentityError `IDENTITY.API_KEY.INVALID` con `Retry-After` mientras el prefijo está bloqueado
   *   desde esa IP, aunque el secreto sea el correcto.
   */
  async resolve(
    prefix: string,
    secretSha256: string,
    clientIp?: string,
  ): Promise<ApiKeyPrincipal> {
    const account = this.lockoutKeys.apiKey(prefix);
    // Sin IP los fallos cuentan solo para el prefijo: no comparten contador con otros clientes sin IP.
    const ip = clientIp ?? account;
    const locked = await this.lockout.remainingLockMs(account, ip);
    if (locked !== undefined) {
      throw IdentityError.retryAfter(IdentityErrorCode.ApiKeyInvalid, locked);
    }
    let verified: Verified;
    try {
      verified = await this.verify(prefix, secretSha256, clientIp);
    } catch (error) {
      if (
        error instanceof IdentityError &&
        error.code === IdentityErrorCode.ApiKeyInvalid
      ) {
        await this.lockout.recordFailure(account, ip);
      }
      throw error;
    }
    await this.tenants.assertActive(verified.principal.tenantId);
    await this.lockout.clear(account, ip);
    await this.usage.record({
      tenantId: verified.principal.tenantId,
      apiKeyId: verified.principal.apiKeyId,
      lastUsedAt: this.clock.now(),
    });
    await this.share(prefix, secretSha256, verified, clientIp);
    return verified.principal;
  }

  private async verify(
    prefix: string,
    secretSha256: string,
    clientIp: string | undefined,
  ): Promise<Verified> {
    const tenantId = await this.directory.tenantOf(prefix);
    if (tenantId === undefined) {
      throw new IdentityError(IdentityErrorCode.ApiKeyInvalid);
    }
    const now = this.clock.now();
    return this.scopes.inTenantShard(tenantId, async () => {
      const key = await this.repository.findKeyByPrefix(prefix);
      if (
        key === undefined ||
        !this.hasher.matches(secretSha256, key.snapshot().secretHmac)
      ) {
        throw new IdentityError(IdentityErrorCode.ApiKeyInvalid);
      }
      const state = key.snapshot();
      if (key.isExpired(now)) {
        throw new IdentityError(IdentityErrorCode.ApiKeyExpired);
      }
      if (!key.isUsable(now)) {
        throw new IdentityError(IdentityErrorCode.ApiKeyInvalid);
      }
      // Sin IP no se puede probar que la llamada viene de un rango permitido: la key no vale.
      if (
        state.allowedCidrs.length > 0 &&
        (clientIp === undefined || !isIpInAnyCidr(clientIp, state.allowedCidrs))
      ) {
        throw new IdentityError(IdentityErrorCode.ApiKeyIpNotAllowed);
      }
      const account = await this.repository.findServiceAccount(
        state.serviceAccountId,
      );
      if (
        account === undefined ||
        account.status !== ServiceAccountStatus.Active
      ) {
        throw new IdentityError(IdentityErrorCode.ServiceAccountDisabled);
      }
      return {
        key,
        principal: {
          apiKeyId: state.id,
          serviceAccountId: account.id,
          tenantId,
          permissions: [...account.permissions],
          environment: state.environment,
          expiresAt: state.expiresAt?.toISOString() ?? null,
          pinnedApiVersion: account.pinnedApiVersion ?? null,
        },
      };
    });
  }

  /**
   * Deja la copia que leen los demás servicios. Una revocación (o un cambio de la cuenta) que confirma entre
   * la verificación y esta escritura ya borró la copia, y la escritura la volvería a dejar con lo de antes.
   * Por eso, después de escribir, se vuelve a verificar la key: si ya no vale o su copia cambió, se borra.
   */
  private async share(
    prefix: string,
    secretSha256: string,
    verified: Verified,
    clientIp: string | undefined,
  ): Promise<void> {
    const cached = this.copyOf(verified);
    if (cached === undefined) {
      return;
    }
    await this.state.putApiKey(prefix, secretSha256, cached);
    const current = await this.verify(prefix, secretSha256, clientIp).then(
      (fresh) => this.copyOf(fresh),
      (error: unknown) => {
        if (error instanceof IdentityError) {
          return undefined;
        }
        throw error;
      },
    );
    if (current === undefined || !isDeepStrictEqual(current, cached)) {
      await this.state.dropApiKey(prefix);
    }
  }

  /**
   * La copia de una key. Una key limitada por CIDR no se copia: quien lee la copia no revisa la IP, y
   * aceptarla desde ahí abriría la key a cualquier origen. Una key rotada vence en la copia cuando termina
   * su gracia.
   */
  private copyOf({
    key,
    principal,
  }: Verified): CachedApiKeyPrincipal | undefined {
    const state = key.snapshot();
    if (state.allowedCidrs.length > 0) {
      return undefined;
    }
    const ends = [state.expiresAt, state.validUntil]
      .filter((at): at is Date => at !== undefined)
      .map((at) => at.getTime());
    return {
      apiKeyId: principal.apiKeyId,
      serviceAccountId: principal.serviceAccountId,
      tenantId: principal.tenantId,
      environment:
        principal.environment === ContractApiKeyEnvironment.Live
          ? ApiKeyEnvironment.Live
          : ApiKeyEnvironment.Test,
      permissions: principal.permissions,
      ...(ends.length === 0
        ? {}
        : {
            expiresAt: Math.floor(
              Math.min(...ends) / AuthenticateApiKey.SECOND_MS,
            ),
          }),
    };
  }
}
