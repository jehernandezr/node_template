import { Injectable } from '@nestjs/common';
import {
  ApiKeyCreatedEvent,
  ApiKeyRevokedEvent,
  ServiceAccountStatus,
  IdentityErrorCode,
  type ApiKeyEnvironment,
  type ApiKeyPage,
  type CreateApiKeyRequest,
  type CreatedApiKey,
} from '@contracts/identity';
import { ApiKeyFormat, AuthStateWriter } from '@platform/auth';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentitySettings } from '../../../config/identity-settings.js';
import { SecretGenerator } from '../../../security/secret-generator.js';
import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import {
  ApiKeyDirectory,
  ApiKeyRepository,
  ApiKeySecretHasher,
} from '../domain/api-key-store.js';
import { ApiKey } from '../domain/api-key.js';
import { ApiKeyViews } from './api-key-views.js';

/** Datos de una key nueva: la cuenta, el ambiente y sus restricciones. */
interface NewKey {
  readonly serviceAccountId: string;
  readonly environment: ApiKeyEnvironment;
  readonly expiresAt?: Date;
  readonly allowedCidrs: readonly string[];
}

/**
 * API keys de una cuenta de servicio. El secreto se muestra una sola vez; se guarda su HMAC. Rotar crea una
 * key nueva y deja la anterior válida `API_KEY_ROTATION_GRACE_HOURS`; revocar borra `auth:apikey:{prefix}`.
 */
@Injectable()
export class ManageApiKeys {
  private static readonly HOUR_MS = 3_600_000;
  private static readonly SECRET_LENGTH = 48;

  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly directory: ApiKeyDirectory,
    private readonly hasher: ApiKeySecretHasher,
    private readonly generator: SecretGenerator,
    private readonly state: AuthStateWriter,
    private readonly bus: MessageBus,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly settings: IdentitySettings,
  ) {}

  async list(tenantId: string, serviceAccountId: string): Promise<ApiKeyPage> {
    const keys = await this.scopes.inTenantShard(tenantId, () =>
      this.repository.listKeys(serviceAccountId),
    );
    return { items: keys.map((key) => ApiKeyViews.key(key)), nextCursor: null };
  }

  async create(
    tenantId: string,
    createdBy: string,
    request: CreateApiKeyRequest,
  ): Promise<CreatedApiKey> {
    return this.issue(tenantId, createdBy, {
      serviceAccountId: request.serviceAccountId,
      environment: request.environment,
      ...(request.expiresAt === undefined
        ? {}
        : { expiresAt: new Date(request.expiresAt) }),
      allowedCidrs: request.allowedCidrs ?? [],
    });
  }

  async rotate(
    tenantId: string,
    createdBy: string,
    apiKeyId: string,
  ): Promise<CreatedApiKey> {
    const previous = await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const key = await this.repository.findKey(apiKeyId);
        if (key === undefined || !key.isUsable(this.clock.now())) {
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
    return this.issue(tenantId, createdBy, {
      serviceAccountId: previous.serviceAccountId,
      environment: previous.environment,
      ...(previous.expiresAt === undefined
        ? {}
        : { expiresAt: previous.expiresAt }),
      allowedCidrs: previous.allowedCidrs,
    });
  }

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
}
