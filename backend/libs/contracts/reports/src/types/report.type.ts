import type { Page, UserRef } from '@contracts/platform';
import type {
  ReportColumnKind,
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportType,
} from '../enums/reports.enum.js';

/** Parameters of a report: calendar date range and granularity. */
export interface ReportParams {
  from: string;
  to: string;
  granularity: ReportGranularity;
}

/** Column of a report result. */
export interface ReportColumn {
  key: string;
  header: string;
  kind: ReportColumnKind;
}

/** Result row: one text cell per column, in the same order. */
export interface ReportRow {
  cells: string[];
}

/** Tabular result of a finished run. */
export interface ReportResult {
  columns: ReportColumn[];
  rows: ReportRow[];
}

/** Available report type, with its formats and granularities. */
export interface ReportCatalogEntry {
  type: ReportType;
  formats: ReportFormat[];
  granularities: ReportGranularity[];
}

export interface ReportCatalog {
  items: ReportCatalogEntry[];
}

/** Request for a report run. */
export interface CreateReportRunRequest {
  type: ReportType;
  format: ReportFormat;
  params: ReportParams;
}

/** Accepted run: the result is queried by its id. */
export interface ReportRunCreated {
  runId: string;
}

/** Report run without its result, for lists. */
export interface ReportRunSummary {
  id: string;
  type: ReportType;
  status: ReportRunStatus;
  format: ReportFormat;
  params: ReportParams;
  requestedBy: UserRef;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export type ReportRunPage = Page<ReportRunSummary>;

/** Filters and pagination of the run listing. */
export interface ListReportRunsRequest {
  type?: ReportType;
  status?: ReportRunStatus;
  limit?: number;
  after?: string;
}

export interface GetReportRunRequest {
  runId: string;
}

/** Run with its result; `result` is null while it is not ready. */
export interface ReportRunDetail extends ReportRunSummary {
  result: ReportResult | null;
}

export interface DownloadReportRunRequest {
  runId: string;
}

/** Download of a ready run, with the content in the requested format. */
export interface ReportDownload {
  fileName: string;
  contentType: string;
  content: string;
}

/** Input of the internal operation that deletes a user's data in reports. */
export interface EraseReportsUserInput {
  user: UserRef;
}

export interface EraseReportsUserResult {
  userId: string;
  affectedRows: number;
}
