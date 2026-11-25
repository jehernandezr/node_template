import { Compensation, defineOperation } from '@contracts/platform';
import {
  IdentityErrorCode,
  IdentityOperation,
} from '../enums/identifiers.enum.js';
import {
  CreateTenantInputSchema,
  SuspendTenantInputSchema,
  TenantOperationResultSchema,
  TenantRefInputSchema,
  TenantSummarySchema,
} from '../schemas/tenant.schema.js';

/**
 * Creates a tenant in provisioning. Its reversal discards it, so the
 * saga does not leave half-made tenants if it fails later.
 */
export const CreateTenantOperation = defineOperation({
  id: IdentityOperation.CreateTenant,
  input: CreateTenantInputSchema,
  output: TenantSummarySchema,
  idempotent: true,
  compensatedBy: IdentityOperation.DiscardTenant,
  errors: [IdentityErrorCode.TenantSlugTaken],
  timeoutMs: 3000,
  description: 'Creates a tenant being provisioned with its owner.',
});

/**
 * Discards a tenant that never became active. It is not reverted: the tenant never
 * had business data to recover.
 */
export const DiscardTenantOperation = defineOperation({
  id: IdentityOperation.DiscardTenant,
  input: TenantRefInputSchema,
  output: TenantOperationResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Only deletes a tenant being provisioned, which has no business data to restore.',
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Discards a tenant being provisioned.',
});

/** Suspends a tenant. Its reversal reactivates it. */
export const SuspendTenantOperation = defineOperation({
  id: IdentityOperation.SuspendTenant,
  input: SuspendTenantInputSchema,
  output: TenantOperationResultSchema,
  idempotent: true,
  compensatedBy: IdentityOperation.ReactivateTenant,
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Suspends a tenant and revokes its tokens.',
});

/** Reactivates a suspended tenant. Its reversal suspends it again. */
export const ReactivateTenantOperation = defineOperation({
  id: IdentityOperation.ReactivateTenant,
  input: TenantRefInputSchema,
  output: TenantOperationResultSchema,
  idempotent: true,
  compensatedBy: IdentityOperation.SuspendTenant,
  errors: [IdentityErrorCode.TenantNotFound],
  timeoutMs: 3000,
  description: 'Reactivates a suspended tenant.',
});
