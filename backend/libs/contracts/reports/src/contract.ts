import { RecordUsageCommand } from '@contracts/billing';
import {
  defineServiceContract,
  defineTenantMoveOperations,
} from '@contracts/platform';
import { ReportsLimits } from './constants/reports.constants.js';
import {
  ReportsCommand,
  ReportsErrorCode,
  ReportsEvent,
  ReportsOperation,
  ReportsQueue,
  ReportsRoute,
  ReportsTopic,
} from './enums/identifiers.enum.js';
import {
  ReportColumnKind,
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportType,
} from './enums/reports.enum.js';
import { reportsErrorCatalog } from './errors/reports-error-catalog.js';
import {
  ExecuteRunCommand,
  FinanceProjectionsQueue,
  ProjectionsQueue,
  ReportsEventsTopic,
  RunCompletedEvent,
  RunsQueue,
} from './events/index.js';
import { EraseReportsUserDataOperation } from './internal/report.operations.js';
import {
  CreateRunRoute,
  DownloadRunRoute,
  GetRunRoute,
  ListCatalogRoute,
  ListRunsRoute,
} from './http/report.routes.js';
import * as schemas from './schemas/index.js';

const tenantMove = defineTenantMoveOperations('reports');

/** Contrato del servicio reports: catálogo de reportes, ejecuciones y proyecciones por eventos. */
export const reportsContract = defineServiceContract({
  service: 'reports',
  description:
    'Reportes sobre los datos del tenant: catálogo, ejecuciones calculadas en segundo plano y resultado guardado.',
  enums: {
    ReportType,
    ReportRunStatus,
    ReportFormat,
    ReportGranularity,
    ReportColumnKind,
    ReportsErrorCode,
    ReportsRoute,
    ReportsOperation,
    ReportsEvent,
    ReportsCommand,
    ReportsTopic,
    ReportsQueue,
  },
  constants: { ReportsLimits },
  schemas: {
    ReportType: schemas.ReportTypeSchema,
    ReportRunStatus: schemas.ReportRunStatusSchema,
    ReportFormat: schemas.ReportFormatSchema,
    ReportGranularity: schemas.ReportGranularitySchema,
    RunCompletedPayload: schemas.RunCompletedPayloadSchema,
    ExecuteRunPayload: schemas.ExecuteRunPayloadSchema,
    ReportColumnKind: schemas.ReportColumnKindSchema,
    ReportParams: schemas.ReportParamsSchema,
    ReportColumn: schemas.ReportColumnSchema,
    ReportRow: schemas.ReportRowSchema,
    ReportResult: schemas.ReportResultSchema,
    ReportCatalogEntry: schemas.ReportCatalogEntrySchema,
    ReportCatalog: schemas.ReportCatalogSchema,
    CreateReportRunRequest: schemas.CreateReportRunRequestSchema,
    ReportRunCreated: schemas.ReportRunCreatedSchema,
    ReportRunSummary: schemas.ReportRunSummarySchema,
    ReportRunPage: schemas.ReportRunPageSchema,
    ListReportRunsRequest: schemas.ListReportRunsRequestSchema,
    GetReportRunRequest: schemas.GetReportRunRequestSchema,
    ReportRunDetail: schemas.ReportRunDetailSchema,
    DownloadReportRunRequest: schemas.DownloadReportRunRequestSchema,
    ReportDownload: schemas.ReportDownloadSchema,
    EraseReportsUserInput: schemas.EraseReportsUserInputSchema,
    EraseReportsUserResult: schemas.EraseReportsUserResultSchema,
  },
  routes: {
    listCatalog: ListCatalogRoute,
    createRun: CreateRunRoute,
    listRuns: ListRunsRoute,
    getRun: GetRunRoute,
    downloadRun: DownloadRunRoute,
  },
  operations: {
    eraseUserData: EraseReportsUserDataOperation,
    tenantMoveSync: tenantMove.tenantMoveSync,
    tenantMoveFinalize: tenantMove.tenantMoveFinalize,
    tenantMoveAbort: tenantMove.tenantMoveAbort,
    tenantMoveCleanup: tenantMove.tenantMoveCleanup,
  },
  events: { runCompleted: RunCompletedEvent },
  commands: { executeRun: ExecuteRunCommand },
  topics: { events: ReportsEventsTopic },
  queues: {
    runs: RunsQueue,
    projections: ProjectionsQueue,
    financeProjections: FinanceProjectionsQueue,
  },
  sends: [ExecuteRunCommand, RecordUsageCommand],
  errors: { ReportsErrorCode: reportsErrorCatalog },
});
