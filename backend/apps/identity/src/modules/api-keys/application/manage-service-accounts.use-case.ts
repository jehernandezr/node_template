import { Injectable } from '@nestjs/common';
import {
  ApiKeyStatus,
  ServiceAccountStatus,
  type CreateServiceAccountRequest,
  type ServiceAccountPage,
  type ServiceAccountSummary,
  type UpdateServiceAccountRequest,
} from '@contracts/identity';
import type { Actor } from '@platform/auth';
import { AuthStateWriter } from '@platform/auth';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { ApiKeyRepository } from '../domain/api-key-store.js';
import type { ServiceAccount } from '../domain/service-account.js';
import { ApiKeyViews } from './api-key-views.js';
import { GrantablePermissions } from './grantable-permissions.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';

/** The tenant's service accounts. Disabling one revokes its keys in the same step. */
@Injectable()
export class ManageServiceAccounts {
  constructor(
    private readonly repository: ApiKeyRepository,
    private readonly grantable: GrantablePermissions,
    private readonly state: AuthStateWriter,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async list(tenantId: string): Promise<ServiceAccountPage> {
    const accounts = await this.scopes.inTenantShard(tenantId, () =>
      this.repository.listServiceAccounts(),
    );
    return {
      items: accounts.map((account) => ApiKeyViews.account(account)),
      nextCursor: null,
    };
  }

  async create(
    tenantId: string,
    actor: Actor | undefined,
    request: CreateServiceAccountRequest,
  ): Promise<ServiceAccountSummary> {
    await this.grantable.assert(actor, request.permissions);
    const account: ServiceAccount = {
      id: this.ids.next().toString(),
      tenantId,
      name: request.name,
      permissions: [...new Set(request.permissions)],
      status: ServiceAccountStatus.Active,
      ...(request.pinnedApiVersion === undefined
        ? {}
        : { pinnedApiVersion: request.pinnedApiVersion }),
      createdAt: this.clock.now(),
    };
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(() =>
        this.repository.insertServiceAccount(account),
      ),
    );
    return ApiKeyViews.account(account);
  }

  async update(
    tenantId: string,
    actor: Actor | undefined,
    request: UpdateServiceAccountRequest,
  ): Promise<ServiceAccountSummary> {
    if (request.permissions !== undefined) {
      await this.grantable.assert(actor, request.permissions);
    }
    const updated = await this.change(
      tenantId,
      request.serviceAccountId,
      async (account) => {
        const next: ServiceAccount = {
          ...account,
          ...(request.name === undefined ? {} : { name: request.name }),
          ...(request.permissions === undefined
            ? {}
            : { permissions: [...new Set(request.permissions)] }),
        };
        await this.repository.updateServiceAccount(next);
        return next;
      },
    );
    for (const prefix of updated.prefixes) {
      await this.state.dropApiKey(prefix);
    }
    return ApiKeyViews.account(updated.account);
  }

  async disable(tenantId: string, serviceAccountId: string): Promise<void> {
    const disabled = await this.change(
      tenantId,
      serviceAccountId,
      async (account) => {
        const next = { ...account, status: ServiceAccountStatus.Disabled };
        await this.repository.updateServiceAccount(next);
        for (const key of await this.repository.listKeys(serviceAccountId)) {
          if (key.snapshot().status !== ApiKeyStatus.Revoked && key.revoke()) {
            await this.repository.updateKey(key);
          }
        }
        return next;
      },
    );
    for (const prefix of disabled.prefixes) {
      await this.state.dropApiKey(prefix);
    }
  }

  /** Applies the change and returns the prefixes of its keys, whose `auth:apikey:*` cache must be deleted. */
  private change(
    tenantId: string,
    serviceAccountId: string,
    apply: (account: ServiceAccount) => Promise<ServiceAccount>,
  ): Promise<{ account: ServiceAccount; prefixes: readonly string[] }> {
    return this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        const account =
          await this.repository.findServiceAccount(serviceAccountId);
        if (account === undefined) {
          throw IdentityError.notFound();
        }
        const next = await apply(account);
        const keys = await this.repository.listKeys(serviceAccountId);
        return {
          account: next,
          prefixes: keys.map((key) => key.snapshot().prefix),
        };
      }),
    );
  }
}
