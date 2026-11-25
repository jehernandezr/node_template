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
    'Move of a tenant to another shard group or region.',
  ) satisfies z.ZodType<TenantMoveRef>;

export const TenantMoveTableProgressSchema = z
  .object({
    table: TableFieldSchema,
    copiedRows: RowCountSchema,
    pendingRows: RowCountSchema,
  })
  .describe(
    'Copy progress of a table.',
  ) satisfies z.ZodType<TenantMoveTableProgress>;

export const TenantMoveProgressSchema = z
  .object({
    tables: z
      .array(TenantMoveTableProgressSchema)
      .max(TenantMoveLimits.maxTables),
    caughtUp: z.boolean(),
  })
  .describe('Result of a copy round.') satisfies z.ZodType<TenantMoveProgress>;

export const TenantMoveTableCheckSchema = z
  .object({
    table: TableFieldSchema,
    sourceRows: RowCountSchema,
    targetRows: RowCountSchema,
    sourceChecksum: z.string().min(1).max(TenantMoveLimits.checksumMaxLength),
    targetChecksum: z.string().min(1).max(TenantMoveLimits.checksumMaxLength),
  })
  .describe(
    'Count and checksum of a table in the source and the target.',
  ) satisfies z.ZodType<TenantMoveTableCheck>;

export const TenantMoveVerificationSchema = z
  .object({
    verified: z.boolean(),
    tables: z.array(TenantMoveTableCheckSchema).max(TenantMoveLimits.maxTables),
  })
  .describe(
    'Result of the last round and the verification of a move.',
  ) satisfies z.ZodType<TenantMoveVerification>;

export const TenantMoveAckSchema = z
  .object({ moveId: IdSchema })
  .describe(
    'Acknowledgement of a move cancellation or cleanup.',
  ) satisfies z.ZodType<TenantMoveAck>;
