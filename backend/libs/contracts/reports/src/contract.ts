import { RecordUsageCommand } from '@contracts/billing';
import {
  defineServiceContract,
  defineTenantDirectoryOperations,
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

/** The tenant move operations of reports, with their exact type to register and call them. */
export const ReportsTenantMoveOperations =
  defineTenantMoveOperations('reports');

/** The tenant directory operations of reports, with their exact type to register and call them. */
export const ReportsTenantDirectoryOperations =
  defineTenantDirectoryOperations('reports');

/** Contract of the reports service: report catalog, runs and event-driven projections. */
export const reportsContract = defineServiceContract({
  service: 'reports',
  description:
    'Reports on tenant data: catalog, runs computed in the background and stored result.',
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
    tenantMoveSync: ReportsTenantMoveOperations.tenantMoveSync,
    tenantMoveFinalize: ReportsTenantMoveOperations.tenantMoveFinalize,
    tenantMoveAbort: ReportsTenantMoveOperations.tenantMoveAbort,
    tenantMoveSwitch: ReportsTenantMoveOperations.tenantMoveSwitch,
    tenantMoveCleanup: ReportsTenantMoveOperations.tenantMoveCleanup,
    tenantDirectoryPlace: ReportsTenantDirectoryOperations.tenantDirectoryPlace,
    tenantDirectoryRemove:
      ReportsTenantDirectoryOperations.tenantDirectoryRemove,
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
