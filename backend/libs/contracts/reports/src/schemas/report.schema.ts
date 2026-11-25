import { z } from 'zod';
import {
  CalendarDateSchema,
  CursorSchema,
  IdSchema,
  PageLimitSchema,
  pageOf,
  TimestampSchema,
  UserRefSchema,
} from '@contracts/platform';
import { ReportsLimits } from '../constants/reports.constants.js';
import { ReportColumnKind } from '../enums/reports.enum.js';
import type {
  CreateReportRunRequest,
  DownloadReportRunRequest,
  EraseReportsUserInput,
  EraseReportsUserResult,
  GetReportRunRequest,
  ListReportRunsRequest,
  ReportCatalog,
  ReportCatalogEntry,
  ReportColumn,
  ReportDownload,
  ReportParams,
  ReportResult,
  ReportRow,
  ReportRunCreated,
  ReportRunDetail,
  ReportRunPage,
  ReportRunSummary,
} from '../types/report.type.js';
import {
  ReportFormatSchema,
  ReportGranularitySchema,
  ReportRunStatusSchema,
  ReportTypeSchema,
} from './event.schema.js';

export const ReportColumnKindSchema = z
  .enum(ReportColumnKind)
  .describe(
    'Data type of a result column.',
  ) satisfies z.ZodType<ReportColumnKind>;

export const ReportParamsSchema = z
  .strictObject({
    from: CalendarDateSchema,
    to: CalendarDateSchema,
    granularity: ReportGranularitySchema,
  })
  .describe(
    'Date range and granularity of a report.',
  ) satisfies z.ZodType<ReportParams>;

export const ReportColumnSchema = z
  .object({
    key: z.string().min(1).max(ReportsLimits.columnKeyMaxLength),
    header: z.string().min(1).max(ReportsLimits.columnHeaderMaxLength),
    kind: ReportColumnKindSchema,
  })
  .describe('Column of a report result.') satisfies z.ZodType<ReportColumn>;

export const ReportRowSchema = z
  .object({
    cells: z
      .array(z.string().max(ReportsLimits.cellMaxLength))
      .max(ReportsLimits.maxColumns),
  })
  .describe('Row of a report result.') satisfies z.ZodType<ReportRow>;

export const ReportResultSchema = z
  .object({
    columns: z.array(ReportColumnSchema).max(ReportsLimits.maxColumns),
    rows: z.array(ReportRowSchema).max(ReportsLimits.maxRows),
  })
  .describe(
    'Tabular result of a finished run.',
  ) satisfies z.ZodType<ReportResult>;

export const ReportCatalogEntrySchema = z
  .object({
    type: ReportTypeSchema,
    formats: z.array(ReportFormatSchema).min(1).max(ReportsLimits.maxFormats),
    granularities: z
      .array(ReportGranularitySchema)
      .min(1)
      .max(ReportsLimits.maxGranularities),
  })
  .describe(
    'Available report type, with its formats and granularities.',
  ) satisfies z.ZodType<ReportCatalogEntry>;

export const ReportCatalogSchema = z
  .object({
    items: z
      .array(ReportCatalogEntrySchema)
      .max(ReportsLimits.maxCatalogEntries),
  })
  .describe(
    'Catalog of reports the tenant can request.',
  ) satisfies z.ZodType<ReportCatalog>;

export const CreateReportRunRequestSchema = z
  .strictObject({
    type: ReportTypeSchema,
    format: ReportFormatSchema,
    params: ReportParamsSchema,
  })
  .describe(
    'Request for a report run.',
  ) satisfies z.ZodType<CreateReportRunRequest>;

export const ReportRunCreatedSchema = z
  .object({ runId: IdSchema })
  .describe(
    'Run accepted; its result is queried by id.',
  ) satisfies z.ZodType<ReportRunCreated>;

export const ReportRunSummarySchema = z
  .object({
    id: IdSchema,
    type: ReportTypeSchema,
    status: ReportRunStatusSchema,
    format: ReportFormatSchema,
    params: ReportParamsSchema,
    requestedBy: UserRefSchema,
    createdAt: TimestampSchema,
    completedAt: TimestampSchema.nullable(),
    expiresAt: TimestampSchema.nullable(),
  })
  .describe(
    'Report run without its result.',
  ) satisfies z.ZodType<ReportRunSummary>;

export const ReportRunPageSchema = pageOf(
  ReportRunSummarySchema,
  'Page of report runs.',
) satisfies z.ZodType<ReportRunPage>;

export const ListReportRunsRequestSchema = z
  .strictObject({
    type: ReportTypeSchema.optional(),
    status: ReportRunStatusSchema.optional(),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Filters and pagination of the run listing.',
  ) satisfies z.ZodType<ListReportRunsRequest>;

export const GetReportRunRequestSchema = z
  .strictObject({ runId: IdSchema })
  .describe('Report run to query.') satisfies z.ZodType<GetReportRunRequest>;

export const ReportRunDetailSchema = ReportRunSummarySchema.extend({
  result: ReportResultSchema.nullable(),
}).describe(
  'Report run with its result, null until it is ready.',
) satisfies z.ZodType<ReportRunDetail>;

export const DownloadReportRunRequestSchema = z
  .strictObject({ runId: IdSchema })
  .describe(
    'Report run whose result is downloaded.',
  ) satisfies z.ZodType<DownloadReportRunRequest>;

export const ReportDownloadSchema = z
  .object({
    fileName: z.string().min(1).max(ReportsLimits.fileNameMaxLength),
    contentType: z.string().min(1).max(ReportsLimits.contentTypeMaxLength),
    content: z.string().max(ReportsLimits.downloadContentMaxLength),
  })
  .describe(
    'Content of a report ready to download.',
  ) satisfies z.ZodType<ReportDownload>;

/** User whose data in reports is erased. */
export const EraseReportsUserInputSchema = z
  .strictObject({ user: UserRefSchema })
  .describe(
    'User whose data is deleted from reports.',
  ) satisfies z.ZodType<EraseReportsUserInput>;

export const EraseReportsUserResultSchema = z
  .object({
    userId: IdSchema,
    affectedRows: z.int().min(0),
  })
  .describe(
    'Reports rows that stopped storing the user.',
  ) satisfies z.ZodType<EraseReportsUserResult>;
