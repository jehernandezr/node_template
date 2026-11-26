import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  ApiKeyCreatedEvent,
  ApiKeyRevokedEvent,
  ApiKeyStatus,
  ServiceAccountStatus,
  IdentityErrorCode,
  type ApiKeyEnvironment,
  type ApiKeyPage,
  type CreateApiKeyRequest,
  type CreatedApiKey,
} from '@contracts/identity';
import {
  ActorGuards,
  ApiKeyFormat,
  AuthStateWriter,
  type Actor,
} from '@platform/auth';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import {
  ApiKeyDirectory,
  ApiKeyRepository,
  ApiKeySecretHasher,
} from '../domain/api-key-store.js';
import { ApiKey } from '../domain/api-key.js';
import { ApiKeyViews } from './api-key-views.js';
import { GrantablePermissions } from './grantable-permissions.js';

/** Data of a new key: the account, the environment and its restrictions. */
interface NewKey {
  readonly serviceAccountId: string;
  readonly environment: ApiKeyEnvironment;
  readonly expiresAt?: Date;
  readonly allowedCidrs: readonly string[];
}

/**
 * API keys of a service account. The secret is shown only once; its HMAC is stored. Issuing or rotating a
 * key hands out the permissions of its account, so the caller must hold every one of them. Rotating creates
 * a new key and leaves the previous one valid for `API_KEY_ROTATION_GRACE_HOURS`; revoking deletes
 * `auth:apikey:{prefix}`.
 */
@Injectable()
export class ManageApiKeys {
  private static readonly HOUR_MS = 3_600_000;
  private static readonly SECRET_LENGTH = 48;

  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly directory: ApiKeyDirectory,
    private readonly hasher: ApiKeySecretHasher,
    private readonly grantable: GrantablePermissions,
    private readonly generator: SecretGenerator,
    private readonly state: AuthStateWriter,
    private readonly bus: MessageBus,
    private readonly scopes: ShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  /**
   * Lists the keys of a service account.
   * @param tenantId Tenant of the account.
   * @param serviceAccountId Account whose keys are listed.
   * @returns The keys, without their secrets.
   */
  async list(tenantId: string, serviceAccountId: string): Promise<ApiKeyPage> {
    const keys = await this.scopes.inTenantShard(tenantId, () =>
      this.repository.listKeys(serviceAccountId),
    );
    return { items: keys.map((key) => ApiKeyViews.key(key)), nextCursor: null };
  }

  /**
   * Issues a new key for a service account.
   * @param tenantId Tenant of the account.
   * @param actor Caller, who must hold every permission of the account.
   * @param request Account, environment, expiry and allowed CIDRs.
   * @returns The key and its secret, shown only this time.
   * @throws IdentityError `IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE` if the account has a permission the caller lacks.
   * @throws IdentityError `IDENTITY.SERVICE_ACCOUNT.DISABLED` if the account is disabled.
   */
  async create(
    tenantId: string,
    actor: Actor | undefined,
    request: CreateApiKeyRequest,
  ): Promise<CreatedApiKey> {
    await this.assertGrantable(tenantId, actor, request.serviceAccountId);
    return this.issue(tenantId, ManageApiKeys.actorIdOf(actor), {
      serviceAccountId: request.serviceAccountId,
      environment: request.environment,
      ...(request.expiresAt === undefined
        ? {}
        : { expiresAt: new Date(request.expiresAt) }),
      allowedCidrs: request.allowedCidrs ?? [],
    });
  }

  /**
   * Rotates an active key: issues a new one and leaves the old one valid for the grace period.
   * @param tenantId Tenant of the key.
   * @param actor Caller, who must hold every permission of the key's account.
   * @param apiKeyId Key to rotate.
   * @returns The new key and its secret, shown only this time.
   * @throws IdentityError `IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE` if the account has a permission the caller lacks.
   * @throws IdentityError `PLATFORM.RESOURCE.NOT_FOUND` if the key does not exist or is not active.
   */
  async rotate(
    tenantId: string,
    actor: Actor | undefined,
    apiKeyId: string,
  ): Promise<CreatedApiKey> {
    const current = await this.scopes.inTenantShard(tenantId, () =>
      this.repository.findKey(apiKeyId),
    );
    if (current === undefined || !this.isRotatable(current)) {
      throw IdentityError.notFound();
    }
    await this.assertGrantable(
      tenantId,
      actor,
      current.snapshot().serviceAccountId,
    );
    const previous = await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const key = await this.repository.findKey(apiKeyId);
        if (key === undefined || !this.isRotatable(key)) {
          throw IdentityError.notFound();
        }
        key.rotate(
          new Date(
            this.clock.now().getTime() +
              this.settings.values.API_KEY_ROTATION_GRACE_HOURS *
                ManageApiKeys.HOUR_MS,
          ),
        );
        await this.repository.updateKey(key);
        return key.snapshot();
      }),
    );
    await this.state.dropApiKey(previous.prefix);
    return this.issue(tenantId, ManageApiKeys.actorIdOf(actor), {
      serviceAccountId: previous.serviceAccountId,
      environment: previous.environment,
      ...(previous.expiresAt === undefined
        ? {}
        : { expiresAt: previous.expiresAt }),
      allowedCidrs: previous.allowedCidrs,
    });
  }

  /**
   * Revokes a key and drops its cached principal.
   * @param tenantId Tenant of the key.
   * @param apiKeyId Key to revoke.
   * @throws IdentityError `PLATFORM.RESOURCE.NOT_FOUND` if the key does not exist.
   */
  async revoke(tenantId: string, apiKeyId: string): Promise<void> {
    const prefix = await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const key = await this.repository.findKey(apiKeyId);
        if (key === undefined) {
          throw IdentityError.notFound();
        }
        if (key.revoke()) {
          await this.repository.updateKey(key);
          await this.bus.publish(
            ApiKeyRevokedEvent,
            {
              apiKeyId,
              tenantId,
              prefix: key.snapshot().prefix,
              revokedAt: this.clock.now().toISOString(),
            },
            { tenantId },
          );
        }
        return key.snapshot().prefix;
      }),
    );
    await this.state.dropApiKey(prefix);
  }

  private isRotatable(key: ApiKey): boolean {
    return (
      key.snapshot().status === ApiKeyStatus.Active &&
      key.isUsable(this.clock.now())
    );
  }

  private async assertGrantable(
    tenantId: string,
    actor: Actor | undefined,
    serviceAccountId: string,
  ): Promise<void> {
    const account = await this.scopes.inTenantShard(tenantId, () =>
      this.repository.findServiceAccount(serviceAccountId),
    );
    if (account === undefined) {
      throw IdentityError.notFound();
    }
    await this.grantable.assert(actor, account.permissions);
  }

  private async issue(
    tenantId: string,
    createdBy: string,
    input: NewKey,
  ): Promise<CreatedApiKey> {
    const prefix = this.generator.base32(IdentityDefaults.apiKeyPrefixLength);
    const secret = this.generator.alphanumeric(ManageApiKeys.SECRET_LENGTH);
    const now = this.clock.now();
    const key = ApiKey.issue({
      id: this.ids.next().toString(),
      tenantId,
      serviceAccountId: input.serviceAccountId,
      prefix,
      secretHmac: this.hasher.hmac(ApiKeyFormat.hashSecret(secret)),
      environment: input.environment,
      ...(input.expiresAt === undefined ? {} : { expiresAt: input.expiresAt }),
      allowedCidrs: input.allowedCidrs,
      createdAt: now,
    });
    await this.directory.register(
      prefix,
      tenantId,
      this.settings.values.IDENTITY_REGION,
    );
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const account = await this.repository.findServiceAccount(
          input.serviceAccountId,
        );
        if (account === undefined) {
          throw IdentityError.notFound();
        }
        if (account.status !== ServiceAccountStatus.Active) {
          throw new IdentityError(IdentityErrorCode.ServiceAccountDisabled);
        }
        await this.repository.insertKey(key);
        await this.bus.publish(
          ApiKeyCreatedEvent,
          {
            apiKeyId: key.snapshot().id,
            serviceAccountId: input.serviceAccountId,
            tenantId,
            prefix,
            environment: input.environment,
            createdBy,
            createdAt: now.toISOString(),
          },
          { tenantId },
        );
      }),
    );
    return {
      apiKey: ApiKeyViews.key(key),
      secret: `sk_${input.environment}_${prefix}_${secret}`,
    };
  }

  private static actorIdOf(actor: Actor | undefined): string {
    if (actor !== undefined && ActorGuards.isUser(actor)) {
      return actor.userId;
    }
    return actor !== undefined && ActorGuards.isServiceAccount(actor)
      ? actor.serviceAccountId
      : '';
  }
}
