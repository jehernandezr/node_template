import { OpenAccountOperation } from '@contracts/billing';
import {
  ActivateTenantOperation,
  CreateTenantOperation,
  IdentitySaga,
  TenantKind,
} from '@contracts/identity';
import {
  NotificationType,
  NotifyUserOperation,
  TemplateParameter,
} from '@contracts/notifications';
import type { TenantDirectoryEntry } from '@contracts/platform';
import { SagaDefinition, type SagaFlow } from '@platform/saga';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { TenantDirectoryFollowers } from './tenant-directory-followers.js';

/** What the creation saga needs to create, bill, activate and welcome. */
export interface TenantOnboardingState {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  readonly region: string;
  readonly owner: UserRef;
  /** Id of the welcome notification, fixed at start so a retry does not duplicate it. */
  readonly welcomeId: string;
  /** The placement identity chose, which the other services record in their directories. */
  readonly directory: TenantDirectoryEntry;
}

/**
 * Tenant creation: creates the tenant in provisioning, records it in each service's shard directory with the
 * placement identity chose and opens its billing account, all with their reversals; after the pivot it activates it and
 * welcomes its owner. If billing rejects the account, the services remove the tenant's row, the tenant is
 * discarded and its slug is released.
 */
export class TenantOnboardingSaga extends SagaDefinition<TenantOnboardingState> {
  readonly type = IdentitySaga.TenantOnboarding;

  protected define(flow: SagaFlow<TenantOnboardingState>): void {
    flow
      .step(CreateTenantOperation)
      .input((state) => ({
        tenantId: state.tenantId,
        slug: state.slug,
        name: state.name,
        region: state.region,
        kind: TenantKind.Organization,
        ownerUserId: state.owner.userId,
      }))
      .compensationInput((state) => ({ tenantId: state.tenantId }));
    for (const follower of TenantDirectoryFollowers.ALL) {
      flow
        .step(follower.tenantDirectoryPlace)
        .input((state) => state.directory)
        .compensationInput((state) => ({ tenantId: state.tenantId }));
    }
    flow
      .step(OpenAccountOperation)
      .input((state) => ({
        tenantId: state.tenantId,
        ownerUserId: state.owner.userId,
      }))
      .compensationInput((state) => ({ tenantId: state.tenantId }))
      .pivot()
      .step(ActivateTenantOperation)
      .input((state) => ({ tenantId: state.tenantId }))
      .step(NotifyUserOperation)
      .input((state) => ({
        notificationId: state.welcomeId,
        user: state.owner,
        tenantId: state.tenantId,
        type: NotificationType.AccountActivity,
        parameters: [{ name: TemplateParameter.TenantName, value: state.name }],
      }));
  }
}
