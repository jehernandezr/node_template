import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import { ActorGuards, type Actor } from '@platform/auth';
import {
  ListServiceAccountsRoute,
  CreateServiceAccountRoute,
  UpdateServiceAccountRoute,
  DeleteServiceAccountRoute,
  ListApiKeysRoute,
  CreateApiKeyRoute,
  RotateApiKeyRoute,
  RevokeApiKeyRoute,
  type ApiKeyPage,
  type CreateApiKeyRequest,
  type CreateServiceAccountRequest,
  type CreatedApiKey,
  type DeleteServiceAccountRequest,
  type ListApiKeysRequest,
  type RevokeApiKeyRequest,
  type RotateApiKeyRequest,
  type ServiceAccountPage,
  type ServiceAccountSummary,
  type UpdateServiceAccountRequest,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { tenantOfActor } from '../../../shared/utils/user-actor.js';
import { ManageApiKeys } from '../application/manage-api-keys.use-case.js';
import { ManageServiceAccounts } from '../application/manage-service-accounts.use-case.js';

@Resource(IdentityResource.ApiKeys)
export class ApiKeysController {
  constructor(
    private readonly accounts: ManageServiceAccounts,
    private readonly keys: ManageApiKeys,
  ) {}

  @Endpoint(ListServiceAccountsRoute)
  listServiceAccounts(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ServiceAccountPage> {
    return this.accounts.list(tenantOfActor(actor));
  }

  @Endpoint(CreateServiceAccountRoute)
  createServiceAccount(
    @Input() input: CreateServiceAccountRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ServiceAccountSummary> {
    return this.accounts.create(tenantOfActor(actor), actor, input);
  }

  @Endpoint(UpdateServiceAccountRoute)
  updateServiceAccount(
    @Input() input: UpdateServiceAccountRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ServiceAccountSummary> {
    return this.accounts.update(tenantOfActor(actor), actor, input);
  }

  @Endpoint(DeleteServiceAccountRoute)
  async deleteServiceAccount(
    @Input() input: DeleteServiceAccountRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.accounts.disable(tenantOfActor(actor), input.serviceAccountId);
  }

  @Endpoint(ListApiKeysRoute)
  listApiKeys(
    @Input() input: ListApiKeysRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ApiKeyPage> {
    return this.keys.list(tenantOfActor(actor), input.serviceAccountId);
  }

  @Endpoint(CreateApiKeyRoute)
  createApiKey(
    @Input() input: CreateApiKeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<CreatedApiKey> {
    return this.keys.create(
      tenantOfActor(actor),
      ApiKeysController.actorId(actor),
      input,
    );
  }

  @Endpoint(RotateApiKeyRoute)
  rotateApiKey(
    @Input() input: RotateApiKeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<CreatedApiKey> {
    return this.keys.rotate(
      tenantOfActor(actor),
      ApiKeysController.actorId(actor),
      input.apiKeyId,
    );
  }

  @Endpoint(RevokeApiKeyRoute)
  async revokeApiKey(
    @Input() input: RevokeApiKeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.keys.revoke(tenantOfActor(actor), input.apiKeyId);
  }

  private static actorId(actor: Actor | undefined): string {
    if (actor !== undefined && ActorGuards.isUser(actor)) {
      return actor.userId;
    }
    return actor !== undefined && ActorGuards.isServiceAccount(actor)
      ? actor.serviceAccountId
      : '';
  }
}
