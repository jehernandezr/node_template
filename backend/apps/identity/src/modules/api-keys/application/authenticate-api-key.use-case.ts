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

/** A valid key and what is needed to leave its copy in `auth:apikey:*`. */
interface Verified {
  readonly principal: ApiKeyPrincipal;
  readonly key: ApiKey;
}

/**
 * Validates an API key and returns its principal. It looks it up by prefix in the catalog, compares the HMAC of the
 * secret in its tenant's shard and checks expiration, rotation, IP and the state of the account and the tenant.
 * Failures are counted per prefix and IP with the sign-in lockout rules, so the secret of a
 * known prefix cannot be guessed by trial.
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

  /** With the full key, as the internal operation receives it. */
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
   * With the prefix and the SHA-256 of the secret, as `@platform/auth` resolves it.
   * @throws IdentityError `IDENTITY.API_KEY.INVALID` with `Retry-After` while the prefix is locked
   *   from that IP, even if the secret is correct.
   */
  async resolve(
    prefix: string,
    secretSha256: string,
    clientIp?: string,
  ): Promise<ApiKeyPrincipal> {
    const account = this.lockoutKeys.apiKey(prefix);
    // Without an IP, failures count only for the prefix: they do not share a counter with other clients without an IP.
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
      // Without an IP there is no way to prove the call comes from an allowed range: the key is not valid.
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
   * Leaves the copy the other services read. A revocation (or an account change) that commits between
   * verification and this write already deleted the copy, and the write would put it back with the old data.
   * That is why, after writing, the key is verified again: if it is no longer valid or its copy changed, it is deleted.
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
   * The copy of a key. A CIDR-restricted key is not copied: whoever reads the copy does not check the IP, and
   * accepting it from there would open the key to any origin. A rotated key expires in the copy when its
   * grace period ends.
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
