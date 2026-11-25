import { Compensation } from '../enums/compensation.enum.js';
import { TenantMoveLimits } from '../constants/tenant-move.constants.js';
import {
  TenantMoveAckSchema,
  TenantMoveProgressSchema,
  TenantMoveRefSchema,
  TenantMoveVerificationSchema,
} from '../schemas/tenant-move.schema.js';
import {
  defineOperation,
  type OperationDefinition,
} from './define-operation.js';

/** The five move operations of a service, with the keys its contract uses. */
export interface TenantMoveOperations {
  readonly tenantMoveSync: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveProgressSchema
  >;
  readonly tenantMoveFinalize: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveVerificationSchema
  >;
  readonly tenantMoveAbort: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveAckSchema
  >;
  readonly tenantMoveSwitch: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveAckSchema
  >;
  readonly tenantMoveCleanup: OperationDefinition<
    typeof TenantMoveRefSchema,
    typeof TenantMoveAckSchema
  >;
}

/**
 * Declares the `<service>.tenant-move.{sync,finalize,abort,switch,cleanup}.v1` operations
 * that `@platform/tenant-move` registers in each service. The ids are built from the
 * service name and the `<S>Operation` enum of each contract must repeat them.
 */
export function defineTenantMoveOperations(
  service: string,
): TenantMoveOperations {
  const id = (step: string) => `${service}.tenant-move.${step}.v1`;
  const tenantMoveAbort = defineOperation({
    id: id('abort'),
    input: TenantMoveRefSchema,
    output: TenantMoveAckSchema,
    idempotent: true,
    compensatedBy: Compensation.None,
    compensationReason:
      'Only runs as compensation of the copy: discards what was copied to the target and there is nothing to restore.',
    timeoutMs: TenantMoveLimits.abortTimeoutMs,
    description: `Cancels the move of a tenant and discards what was copied from ${service} to the target.`,
  });
  return {
    tenantMoveSync: defineOperation({
      id: id('sync'),
      input: TenantMoveRefSchema,
      output: TenantMoveProgressSchema,
      idempotent: true,
      compensatedBy: id('abort'),
      timeoutMs: TenantMoveLimits.syncTimeoutMs,
      description: `Copies a batch of the tenant data in ${service} to the target while writes continue; the saga repeats until the round completes.`,
    }),
    tenantMoveFinalize: defineOperation({
      id: id('finalize'),
      input: TenantMoveRefSchema,
      output: TenantMoveVerificationSchema,
      idempotent: true,
      compensatedBy: id('abort'),
      timeoutMs: TenantMoveLimits.finalizeTimeoutMs,
      description: `Copies the last round of ${service} with the tenant frozen and verifies counts and sums.`,
    }),
    tenantMoveAbort,
    tenantMoveSwitch: defineOperation({
      id: id('switch'),
      input: TenantMoveRefSchema,
      output: TenantMoveAckSchema,
      idempotent: true,
      compensatedBy: Compensation.None,
      compensationReason:
        'Runs after the pivot: the tenant already lives in the target and it is retried until completed.',
      timeoutMs: TenantMoveLimits.switchTimeoutMs,
      description: `Points ${service} to the target of the moved tenant and reopens its writes.`,
    }),
    tenantMoveCleanup: defineOperation({
      id: id('cleanup'),
      input: TenantMoveRefSchema,
      output: TenantMoveAckSchema,
      idempotent: true,
      compensatedBy: Compensation.None,
      compensationReason:
        'Deletes from the source the data already moved once the grace period expires: it is not restored.',
      timeoutMs: TenantMoveLimits.cleanupTimeoutMs,
      description: `Deletes from ${service} the data of the moved tenant when the grace period ends.`,
    }),
  };
}
