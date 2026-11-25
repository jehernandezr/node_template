import { Injectable } from '@nestjs/common';
import type {
  ApiKeyEnvironment,
  ApiKeyStatus,
  Permission,
  ServiceAccountStatus,
} from '@contracts/identity';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { ApiKeyRepository } from '../../domain/api-key-store.js';
import { ApiKey } from '../../domain/api-key.js';
import type { ServiceAccount } from '../../domain/service-account.js';
import { ApiKeyEntity } from './entities/api-key.entity.js';
import { ServiceAccountEntity } from './entities/service-account.entity.js';

/** `ApiKeyRepository` over `service_accounts` and `api_keys` of the tenant shard. */
@Injectable()
export class TypeOrmApiKeyRepository
  extends TenantIsolatedRepository
  implements ApiKeyRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async listServiceAccounts(): Promise<readonly ServiceAccount[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
      manager.find(ServiceAccountEntity, {
        where: { tenantId },
        order: { createdAt: 'ASC' },
      }),
    );
    return rows.map((row) => this.accountOf(row));
  }

  async findServiceAccount(id: string): Promise<ServiceAccount | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(ServiceAccountEntity, { id, tenantId }),
    );
    return row === null ? undefined : this.accountOf(row);
  }

  async insertServiceAccount(account: ServiceAccount): Promise<void> {
    await this.insertOwned(ServiceAccountEntity, this.accountRow(account));
  }

  async updateServiceAccount(account: ServiceAccount): Promise<void> {
    await this.updateOwned(ServiceAccountEntity, this.accountRow(account));
  }

  async listKeys(serviceAccountId: string): Promise<readonly ApiKey[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
      manager.find(ApiKeyEntity, {
        where: { tenantId, serviceAccountId },
        order: { createdAt: 'ASC' },
      }),
    );
    return rows.map((row) => this.keyOf(row));
  }

  async findKey(id: string): Promise<ApiKey | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(ApiKeyEntity, { id, tenantId }),
    );
    return row === null ? undefined : this.keyOf(row);
  }

  async findKeyByPrefix(prefix: string): Promise<ApiKey | undefined> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(ApiKeyEntity, { prefix, tenantId }),
    );
    return row === null ? undefined : this.keyOf(row);
  }

  async insertKey(key: ApiKey): Promise<void> {
    await this.insertOwned(ApiKeyEntity, this.keyRow(key));
  }

  async updateKey(key: ApiKey): Promise<void> {
    await this.updateOwned(ApiKeyEntity, this.keyRow(key));
  }

  async touchLastUsed(apiKeyId: string, at: Date): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.query(
        `UPDATE "api_keys" SET "last_used_at" = $1 WHERE "id" = $2 AND "tenant_id" = $3 AND ("last_used_at" IS NULL OR "last_used_at" < $1)`,
        [at, apiKeyId, tenantId],
      ),
    );
  }

  private accountOf(row: ServiceAccountEntity): ServiceAccount {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      permissions: row.permissions as Permission[],
      status: row.status as ServiceAccountStatus,
      ...(row.pinnedApiVersion === null
        ? {}
        : { pinnedApiVersion: row.pinnedApiVersion }),
      createdAt: row.createdAt ?? new Date(0),
      ...(row.version === undefined ? {} : { version: row.version }),
    };
  }

  private accountRow(account: ServiceAccount): ServiceAccountEntity {
    const row = new ServiceAccountEntity();
    row.id = account.id;
    row.name = account.name;
    row.permissions = [...account.permissions];
    row.status = account.status;
    row.pinnedApiVersion = account.pinnedApiVersion ?? null;
    if (account.version !== undefined) {
      row.version = account.version;
    }
    return row;
  }

  private keyOf(row: ApiKeyEntity): ApiKey {
    return ApiKey.rehydrate({
      id: row.id,
      tenantId: row.tenantId,
      serviceAccountId: row.serviceAccountId,
      prefix: row.prefix,
      secretHmac: row.secretHmac,
      environment: row.environment as ApiKeyEnvironment,
      ...(row.expiresAt === null ? {} : { expiresAt: row.expiresAt }),
      allowedCidrs: row.allowedCidrs,
      ...(row.lastUsedAt === null ? {} : { lastUsedAt: row.lastUsedAt }),
      status: row.status as ApiKeyStatus,
      ...(row.validUntil === null ? {} : { validUntil: row.validUntil }),
      createdAt: row.createdAt ?? new Date(0),
      ...(row.version === undefined ? {} : { version: row.version }),
    });
  }

  private keyRow(key: ApiKey): ApiKeyEntity {
    const state = key.snapshot();
    const row = new ApiKeyEntity();
    row.id = state.id;
    row.serviceAccountId = state.serviceAccountId;
    row.prefix = state.prefix;
    row.secretHmac = state.secretHmac;
    row.environment = state.environment;
    row.expiresAt = state.expiresAt ?? null;
    row.allowedCidrs = [...state.allowedCidrs];
    row.lastUsedAt = state.lastUsedAt ?? null;
    row.status = state.status;
    row.validUntil = state.validUntil ?? null;
    if (state.version !== undefined) {
      row.version = state.version;
    }
    return row;
  }
}
