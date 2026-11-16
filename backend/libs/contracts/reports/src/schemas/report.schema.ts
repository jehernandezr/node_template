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
    'Tipo de dato de una columna del resultado.',
  ) satisfies z.ZodType<ReportColumnKind>;

export const ReportParamsSchema = z
  .strictObject({
    from: CalendarDateSchema,
    to: CalendarDateSchema,
    granularity: ReportGranularitySchema,
  })
  .describe(
    'Rango de fechas y granularidad de un reporte.',
  ) satisfies z.ZodType<ReportParams>;

export const ReportColumnSchema = z
  .object({
    key: z.string().min(1).max(ReportsLimits.columnKeyMaxLength),
    header: z.string().min(1).max(ReportsLimits.columnHeaderMaxLength),
    kind: ReportColumnKindSchema,
  })
  .describe(
    'Columna del resultado de un reporte.',
  ) satisfies z.ZodType<ReportColumn>;

export const ReportRowSchema = z
  .object({
    cells: z
      .array(z.string().max(ReportsLimits.cellMaxLength))
      .max(ReportsLimits.maxColumns),
  })
  .describe('Fila del resultado de un reporte.') satisfies z.ZodType<ReportRow>;

export const ReportResultSchema = z
  .object({
    columns: z.array(ReportColumnSchema).max(ReportsLimits.maxColumns),
    rows: z.array(ReportRowSchema).max(ReportsLimits.maxRows),
  })
  .describe(
    'Resultado tabular de una ejecución terminada.',
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
    'Tipo de reporte disponible, con sus formatos y granularidades.',
  ) satisfies z.ZodType<ReportCatalogEntry>;

export const ReportCatalogSchema = z
  .object({
    items: z
      .array(ReportCatalogEntrySchema)
      .max(ReportsLimits.maxCatalogEntries),
  })
  .describe(
    'Catálogo de reportes que puede pedir el tenant.',
  ) satisfies z.ZodType<ReportCatalog>;

export const CreateReportRunRequestSchema = z
  .strictObject({
    type: ReportTypeSchema,
    format: ReportFormatSchema,
    params: ReportParamsSchema,
  })
  .describe(
    'Petición de una ejecución de reporte.',
  ) satisfies z.ZodType<CreateReportRunRequest>;

export const ReportRunCreatedSchema = z
  .object({ runId: IdSchema })
  .describe(
    'Ejecución aceptada; su resultado se consulta por el id.',
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
    'Ejecución de reporte sin su resultado.',
  ) satisfies z.ZodType<ReportRunSummary>;

export const ReportRunPageSchema = pageOf(
  ReportRunSummarySchema,
  'Página de ejecuciones de reporte.',
) satisfies z.ZodType<ReportRunPage>;

export const ListReportRunsRequestSchema = z
  .strictObject({
    type: ReportTypeSchema.optional(),
    status: ReportRunStatusSchema.optional(),
    limit: PageLimitSchema.optional(),
    after: CursorSchema.optional(),
  })
  .describe(
    'Filtros y paginación del listado de ejecuciones.',
  ) satisfies z.ZodType<ListReportRunsRequest>;

export const GetReportRunRequestSchema = z
  .strictObject({ runId: IdSchema })
  .describe(
    'Ejecución de reporte a consultar.',
  ) satisfies z.ZodType<GetReportRunRequest>;

export const ReportRunDetailSchema = ReportRunSummarySchema.extend({
  result: ReportResultSchema.nullable(),
}).describe(
  'Ejecución de reporte con su resultado, nulo mientras no esté lista.',
) satisfies z.ZodType<ReportRunDetail>;

export const DownloadReportRunRequestSchema = z
  .strictObject({ runId: IdSchema })
  .describe(
    'Ejecución de reporte cuyo resultado se descarga.',
  ) satisfies z.ZodType<DownloadReportRunRequest>;

export const ReportDownloadSchema = z
  .object({
    fileName: z.string().min(1).max(ReportsLimits.fileNameMaxLength),
    contentType: z.string().min(1).max(ReportsLimits.contentTypeMaxLength),
    content: z.string().max(ReportsLimits.downloadContentMaxLength),
  })
  .describe(
    'Contenido de un reporte listo para descargar.',
  ) satisfies z.ZodType<ReportDownload>;

/** Usuario cuyos datos en reports se borran. */
export const EraseReportsUserInputSchema = z
  .strictObject({ user: UserRefSchema })
  .describe(
    'Usuario cuyos datos se borran de reports.',
  ) satisfies z.ZodType<EraseReportsUserInput>;

export const EraseReportsUserResultSchema = z
  .object({
    userId: IdSchema,
    affectedRows: z.int().min(0),
  })
  .describe(
    'Filas de reports que dejaron de guardar al usuario.',
  ) satisfies z.ZodType<EraseReportsUserResult>;
