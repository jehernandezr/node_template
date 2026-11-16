import type { Page, UserRef } from '@contracts/platform';
import type {
  ReportColumnKind,
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportType,
} from '../enums/reports.enum.js';

/** Parámetros de un reporte: rango de fechas de calendario y granularidad. */
export interface ReportParams {
  from: string;
  to: string;
  granularity: ReportGranularity;
}

/** Columna del resultado de un reporte. */
export interface ReportColumn {
  key: string;
  header: string;
  kind: ReportColumnKind;
}

/** Fila del resultado: una celda de texto por columna, en el mismo orden. */
export interface ReportRow {
  cells: string[];
}

/** Resultado tabular de una ejecución terminada. */
export interface ReportResult {
  columns: ReportColumn[];
  rows: ReportRow[];
}

/** Tipo de reporte disponible, con sus formatos y granularidades. */
export interface ReportCatalogEntry {
  type: ReportType;
  formats: ReportFormat[];
  granularities: ReportGranularity[];
}

export interface ReportCatalog {
  items: ReportCatalogEntry[];
}

/** Petición de una ejecución de reporte. */
export interface CreateReportRunRequest {
  type: ReportType;
  format: ReportFormat;
  params: ReportParams;
}

/** Ejecución aceptada: el resultado se consulta por su id. */
export interface ReportRunCreated {
  runId: string;
}

/** Ejecución de reporte sin resultado, para listas. */
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

/** Filtros y paginación del listado de ejecuciones. */
export interface ListReportRunsRequest {
  type?: ReportType;
  status?: ReportRunStatus;
  limit?: number;
  after?: string;
}

export interface GetReportRunRequest {
  runId: string;
}

/** Ejecución con su resultado; `result` es null mientras no esté lista. */
export interface ReportRunDetail extends ReportRunSummary {
  result: ReportResult | null;
}

export interface DownloadReportRunRequest {
  runId: string;
}

/** Descarga de una ejecución lista, con el contenido en el formato pedido. */
export interface ReportDownload {
  fileName: string;
  contentType: string;
  content: string;
}

/** Entrada de la operación interna que borra los datos de un usuario en reports. */
export interface EraseReportsUserInput {
  user: UserRef;
}

export interface EraseReportsUserResult {
  userId: string;
  affectedRows: number;
}
