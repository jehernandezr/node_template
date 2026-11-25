import { TenantDirectoryLimits } from '../constants/tenant-directory.constants.js';
import { Compensation } from '../enums/compensation.enum.js';
import {
  TenantDirectoryAckSchema,
  TenantDirectoryEntrySchema,
  TenantDirectoryRefSchema,
} from '../schemas/tenant-directory.schema.js';
import {
  defineOperation,
  type OperationDefinition,
} from './define-operation.js';

/** The two tenant directory operations of a service, with the keys its contract uses. */
export interface TenantDirectoryOperations {
  readonly tenantDirectoryPlace: OperationDefinition<
    typeof TenantDirectoryEntrySchema,
    typeof TenantDirectoryAckSchema
  >;
  readonly tenantDirectoryRemove: OperationDefinition<
    typeof TenantDirectoryRefSchema,
    typeof TenantDirectoryAckSchema
  >;
}

/**
 * Declares the `<service>.tenant-directory.{place,remove}.v1` operations that `@platform/tenant-move` registers in
 * each service that follows the placement identity chooses. The ids are built from the service name and the
 * `<S>Operation` enum of each contract must repeat them.
 */
export function defineTenantDirectoryOperations(
  service: string,
): TenantDirectoryOperations {
  const id = (step: string) => `${service}.tenant-directory.${step}.v1`;
  return {
    tenantDirectoryPlace: defineOperation({
      id: id('place'),
      input: TenantDirectoryEntrySchema,
      output: TenantDirectoryAckSchema,
      idempotent: true,
      compensatedBy: id('remove'),
      timeoutMs: TenantDirectoryLimits.placeTimeoutMs,
      description: `Records a new tenant in the ${service} shard directory with the region and groups identity chose; if it is already there, leaves it as is.`,
    }),
    tenantDirectoryRemove: defineOperation({
      id: id('remove'),
      input: TenantDirectoryRefSchema,
      output: TenantDirectoryAckSchema,
      idempotent: true,
      compensatedBy: Compensation.None,
      compensationReason:
        'Only runs as compensation of the creation, before the tenant has data: there is nothing to restore.',
      timeoutMs: TenantDirectoryLimits.removeTimeoutMs,
      description: `Removes from ${service} the directory row of a tenant whose creation is undone.`,
    }),
  };
}
