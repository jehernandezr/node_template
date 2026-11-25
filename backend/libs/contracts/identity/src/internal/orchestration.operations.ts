import {
  Compensation,
  defineOperation,
  TenantMoveAckSchema,
  TenantMoveRefSchema,
} from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  EraseUserInputSchema,
  EraseUserResultSchema,
  ListMembersByPermissionInputSchema,
  ListPushTargetsInputSchema,
  PushTargetsSchema,
  UserRefPageSchema,
} from '../schemas/orchestration.schema.js';
import {
  TenantOperationResultSchema,
  TenantRefInputSchema,
} from '../schemas/tenant.schema.js';

/** Activates a tenant that finished provisioning. It comes after the saga pivot: it is idempotent and is not reverted. */
export const ActivateTenantOperation = defineOperation({
  id: IdentityOperation.ActivateTenant,
  input: TenantRefInputSchema,
  output: TenantOperationResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Runs after the saga pivot: it is retried until completed and is not reverted.',
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Activates a tenant being provisioned.',
});

/** Deletes a user's personal data. It comes after the `DeleteAccount` pivot. */
export const EraseUserOperation = defineOperation({
  id: IdentityOperation.EraseUser,
  input: EraseUserInputSchema,
  output: EraseUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Erasing personal data is irreversible and runs after the saga pivot.',
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 6_000,
  description: 'Erases the personal data of a user.',
});

/** Lists a user's push-enabled devices. Used by notifications for the push channel. */
export const ListPushTargetsOperation = defineOperation({
  id: IdentityOperation.ListPushTargets,
  input: ListPushTargetsInputSchema,
  output: PushTargetsSchema,
  idempotent: true,
  mutating: false,
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Returns the devices of a user with a push token.',
});

/** Lists the members of a tenant that have a permission. Used by notifications to choose recipients. */
export const ListMembersByPermissionOperation = defineOperation({
  id: IdentityOperation.ListMembersByPermission,
  input: ListMembersByPermissionInputSchema,
  output: UserRefPageSchema,
  idempotent: true,
  mutating: false,
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Pages the members of a tenant that have a permission.',
});

/**
 * Closes a tenant move when every service already points to the target. It is the last step of `MoveTenant`: from
 * there the grace period runs before cleaning up the source.
 */
export const FinishTenantMoveOperation = defineOperation({
  id: IdentityOperation.FinishTenantMove,
  input: TenantMoveRefSchema,
  output: TenantMoveAckSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Runs after the saga pivot: it is retried until completed and is not reverted.',
  timeoutMs: 3000,
  description: 'Marks a tenant move as switched in all services.',
});
