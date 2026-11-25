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
    'Ubicación de un tenant que cada servicio anota en su directorio de shards.',
  ) satisfies z.ZodType<TenantDirectoryEntry>;

export const TenantDirectoryRefSchema = z
  .strictObject({ tenantId: IdSchema })
  .describe(
    'Tenant cuya fila se retira del directorio de un servicio.',
  ) satisfies z.ZodType<TenantDirectoryRef>;

export const TenantDirectoryAckSchema = z
  .object({ tenantId: IdSchema })
  .describe(
    'Acuse de la ubicación o del retiro de un tenant en el directorio de un servicio.',
  ) satisfies z.ZodType<TenantDirectoryAck>;
