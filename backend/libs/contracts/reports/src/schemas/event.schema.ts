import { z } from 'zod';
import { IdSchema, TimestampSchema, UserRefSchema } from '@contracts/platform';
import {
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportType,
} from '../enums/reports.enum.js';
import type {
  ExecuteRunPayload,
  RunCompletedPayload,
} from '../types/event.type.js';

export const ReportTypeSchema = z
  .enum(ReportType)
  .describe('Tipo de reporte.') satisfies z.ZodType<ReportType>;

export const ReportRunStatusSchema = z
  .enum(ReportRunStatus)
  .describe(
    'Estado de una ejecución de reporte.',
  ) satisfies z.ZodType<ReportRunStatus>;

export const ReportFormatSchema = z
  .enum(ReportFormat)
  .describe('Formato de un reporte.') satisfies z.ZodType<ReportFormat>;

export const ReportGranularitySchema = z
  .enum(ReportGranularity)
  .describe(
    'Granularidad temporal de un reporte.',
  ) satisfies z.ZodType<ReportGranularity>;

export const RunCompletedPayloadSchema = z
  .object({
    tenantId: IdSchema,
    runId: IdSchema,
    type: ReportTypeSchema,
    status: ReportRunStatusSchema,
    requestedBy: UserRefSchema,
    completedAt: TimestampSchema,
  })
  .describe(
    'Terminó una ejecución de reporte.',
  ) satisfies z.ZodType<RunCompletedPayload>;

export const ExecuteRunPayloadSchema = z
  .strictObject({ tenantId: IdSchema, runId: IdSchema })
  .describe(
    'Retoma una ejecución de reporte en un worker.',
  ) satisfies z.ZodType<ExecuteRunPayload>;
