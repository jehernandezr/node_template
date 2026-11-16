import { z } from 'zod';
import { TenantMoveLimits } from '../constants/tenant-move.constants.js';
import type {
  TenantMoveAck,
  TenantMoveProgress,
  TenantMoveRef,
  TenantMoveTableCheck,
  TenantMoveTableProgress,
  TenantMoveVerification,
} from '../types/tenant-move.type.js';
import { IdSchema } from './id.schema.js';

const TargetFieldSchema = z
  .string()
  .min(1)
  .max(TenantMoveLimits.targetMaxLength);

const TableFieldSchema = z
  .string()
  .min(1)
  .max(TenantMoveLimits.tableNameMaxLength);

const RowCountSchema = z.int().min(0);

export const TenantMoveRefSchema = z
  .strictObject({
    moveId: IdSchema,
    tenantId: IdSchema,
    targetGroup: TargetFieldSchema,
    targetRegion: TargetFieldSchema,
  })
  .describe(
    'Traslado de un tenant a otro grupo de shards o región.',
  ) satisfies z.ZodType<TenantMoveRef>;

export const TenantMoveTableProgressSchema = z
  .object({
    table: TableFieldSchema,
    copiedRows: RowCountSchema,
    pendingRows: RowCountSchema,
  })
  .describe(
    'Avance de la copia de una tabla.',
  ) satisfies z.ZodType<TenantMoveTableProgress>;

export const TenantMoveProgressSchema = z
  .object({
    tables: z
      .array(TenantMoveTableProgressSchema)
      .max(TenantMoveLimits.maxTables),
    caughtUp: z.boolean(),
  })
  .describe(
    'Resultado de una ronda de copia.',
  ) satisfies z.ZodType<TenantMoveProgress>;

export const TenantMoveTableCheckSchema = z
  .object({
    table: TableFieldSchema,
    sourceRows: RowCountSchema,
    targetRows: RowCountSchema,
    sourceChecksum: z.string().min(1).max(TenantMoveLimits.checksumMaxLength),
    targetChecksum: z.string().min(1).max(TenantMoveLimits.checksumMaxLength),
  })
  .describe(
    'Conteo y suma de verificación de una tabla en el origen y el destino.',
  ) satisfies z.ZodType<TenantMoveTableCheck>;

export const TenantMoveVerificationSchema = z
  .object({
    verified: z.boolean(),
    tables: z.array(TenantMoveTableCheckSchema).max(TenantMoveLimits.maxTables),
  })
  .describe(
    'Resultado de la última ronda y de la verificación de un traslado.',
  ) satisfies z.ZodType<TenantMoveVerification>;

export const TenantMoveAckSchema = z
  .object({ moveId: IdSchema })
  .describe(
    'Acuse de una cancelación o una limpieza de traslado.',
  ) satisfies z.ZodType<TenantMoveAck>;
