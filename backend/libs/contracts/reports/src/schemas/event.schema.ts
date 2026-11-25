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
  .describe('Report type.') satisfies z.ZodType<ReportType>;

export const ReportRunStatusSchema = z
  .enum(ReportRunStatus)
  .describe('Status of a report run.') satisfies z.ZodType<ReportRunStatus>;

export const ReportFormatSchema = z
  .enum(ReportFormat)
  .describe('Format of a report.') satisfies z.ZodType<ReportFormat>;

export const ReportGranularitySchema = z
  .enum(ReportGranularity)
  .describe(
    'Time granularity of a report.',
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
  .describe('A report run finished.') satisfies z.ZodType<RunCompletedPayload>;

export const ExecuteRunPayloadSchema = z
  .strictObject({ tenantId: IdSchema, runId: IdSchema })
  .describe(
    'Resumes a report run in a worker.',
  ) satisfies z.ZodType<ExecuteRunPayload>;
