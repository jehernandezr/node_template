import { z } from 'zod';
import { TenantDirectoryLimits } from '../constants/tenant-directory.constants.js';
import type {
  TenantDirectoryAck,
  TenantDirectoryEntry,
  TenantDirectoryRef,
} from '../types/tenant-directory.type.js';
import { IdSchema } from './id.schema.js';

const FieldSchema = z.string().min(1).max(TenantDirectoryLimits.fieldMaxLength);

export const TenantDirectoryEntrySchema = z
  .strictObject({
    tenantId: IdSchema,
    region: FieldSchema,
    groups: z.array(FieldSchema).min(1).max(TenantDirectoryLimits.maxGroups),
    dedicated: z.boolean(),
  })
  .describe(
    'Location of a tenant that each service records in its shard directory.',
  ) satisfies z.ZodType<TenantDirectoryEntry>;

export const TenantDirectoryRefSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Tenant whose row is removed from the directory of a service.',
  ) satisfies z.ZodType<TenantDirectoryRef>;

export const TenantDirectoryAckSchema = z
  .object({ tenantId: IdSchema })
  .describe(
    'Acknowledgement of the placement or removal of a tenant in the directory of a service.',
  ) satisfies z.ZodType<TenantDirectoryAck>;
