import { ActingMember } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import type { Actor } from '@platform/auth';
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
import { ManageApiKeys } from '../application/manage-api-keys.use-case.js';
import { ManageServiceAccounts } from '../application/manage-service-accounts.use-case.js';

/** HTTP edge of the service accounts and API keys of the active tenant. */
@Resource(IdentityResource.ApiKeys)
export class ApiKeysController {
  constructor(
    private readonly accounts: ManageServiceAccounts,
    private readonly keys: ManageApiKeys,
  ) {}

  /**
   * Lists the service accounts of the tenant.
   * @param actor Caller.
   * @returns The service accounts.
   */
  @Endpoint(ListServiceAccountsRoute)
  listServiceAccounts(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ServiceAccountPage> {
    return this.accounts.list(ActingMember.of(actor).tenantId);
  }

  /**
   * Creates a service account with permissions the caller holds.
   * @param input Name, permissions and pinned API version.
   * @param actor Caller.
   * @returns The created account.
   */
  @Endpoint(CreateServiceAccountRoute)
  createServiceAccount(
    @Input() input: CreateServiceAccountRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ServiceAccountSummary> {
    return this.accounts.create(ActingMember.of(actor).tenantId, actor, input);
  }

  /**
   * Updates a service account.
   * @param input Account and the fields to change.
   * @param actor Caller.
   * @returns The updated account.
   */
  @Endpoint(UpdateServiceAccountRoute)
  updateServiceAccount(
    @Input() input: UpdateServiceAccountRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ServiceAccountSummary> {
    return this.accounts.update(ActingMember.of(actor).tenantId, actor, input);
  }

  /**
   * Disables a service account and revokes its keys.
   * @param input Account to disable.
   * @param actor Caller.
   */
  @Endpoint(DeleteServiceAccountRoute)
  async deleteServiceAccount(
    @Input() input: DeleteServiceAccountRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.accounts.disable(
      ActingMember.of(actor).tenantId,
      input.serviceAccountId,
    );
  }

  /**
   * Lists the keys of a service account.
   * @param input Account whose keys are listed.
   * @param actor Caller.
   * @returns The keys.
   */
  @Endpoint(ListApiKeysRoute)
  listApiKeys(
    @Input() input: ListApiKeysRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ApiKeyPage> {
    return this.keys.list(
      ActingMember.of(actor).tenantId,
      input.serviceAccountId,
    );
  }

  /**
   * Issues a key for a service account whose permissions the caller holds.
   * @param input Account, environment, expiry and CIDRs.
   * @param actor Caller.
   * @returns The key and its secret.
   */
  @Endpoint(CreateApiKeyRoute)
  createApiKey(
    @Input() input: CreateApiKeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<CreatedApiKey> {
    return this.keys.create(ActingMember.of(actor).tenantId, actor, input);
  }

  /**
   * Rotates a key whose account permissions the caller holds.
   * @param input Key to rotate.
   * @param actor Caller.
   * @returns The new key and its secret.
   */
  @Endpoint(RotateApiKeyRoute)
  rotateApiKey(
    @Input() input: RotateApiKeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<CreatedApiKey> {
    return this.keys.rotate(
      ActingMember.of(actor).tenantId,
      actor,
      input.apiKeyId,
    );
  }

  /**
   * Revokes a key.
   * @param input Key to revoke.
   * @param actor Caller.
   */
  @Endpoint(RevokeApiKeyRoute)
  async revokeApiKey(
    @Input() input: RevokeApiKeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.keys.revoke(ActingMember.of(actor).tenantId, input.apiKeyId);
  }
}
