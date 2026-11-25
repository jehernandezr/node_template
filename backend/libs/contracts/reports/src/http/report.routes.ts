import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import {
  FeatureFlag,
  Permission,
  SessionGuardErrors,
} from '@contracts/identity';
import { ReportsErrorCode, ReportsRoute } from '../enums/identifiers.enum.js';
import {
  CreateReportRunRequestSchema,
  DownloadReportRunRequestSchema,
  GetReportRunRequestSchema,
  ListReportRunsRequestSchema,
  ReportCatalogSchema,
  ReportDownloadSchema,
  ReportRunCreatedSchema,
  ReportRunDetailSchema,
  ReportRunPageSchema,
} from '../schemas/report.schema.js';

const guard = [...SessionGuardErrors, PlatformErrorCode.AccessFlagDisabled];

/** `GET /v1/reports`: catalog of reports available to the tenant. */
export const ListCatalogRoute = defineRoute({
  id: ReportsRoute.ListCatalog,
  method: HttpMethod.Get,
  path: '/v1/reports',
  response: ReportCatalogSchema,
  errors: guard,
  access: Access.authenticated({
    permissions: [Permission.ReportsRead],
    flags: [FeatureFlag.NewReports],
  }),
  description: 'Lists the report types, with their formats and granularities.',
});

/**
 * `POST /v1/reports/runs`: requests a run. CSV requires the advanced_reports
 * feature and the use case checks it, because it depends on the body and not
 * on the route.
 */
export const CreateRunRoute = defineRoute({
  id: ReportsRoute.CreateRun,
  method: HttpMethod.Post,
  path: '/v1/reports/runs',
  request: CreateReportRunRequestSchema,
  response: ReportRunCreatedSchema,
  successStatus: 202,
  errors: [
    ...guard,
    PlatformErrorCode.ValidationInvalidInput,
    PlatformErrorCode.AccessFeatureNotIncluded,
    ReportsErrorCode.TypeUnknown,
    ReportsErrorCode.ParamsInvalidRange,
  ],
  access: Access.authenticated({
    permissions: [Permission.ReportsWrite],
    flags: [FeatureFlag.NewReports],
  }),
  description: 'Creates a report run. Responds 202 with its id.',
});

/** `GET /v1/reports/runs`: runs of the tenant, newest first. */
export const ListRunsRoute = defineRoute({
  id: ReportsRoute.ListRuns,
  method: HttpMethod.Get,
  path: '/v1/reports/runs',
  request: ListReportRunsRequestSchema,
  response: ReportRunPageSchema,
  errors: [...guard, PlatformErrorCode.ValidationInvalidInput],
  access: Access.authenticated({
    permissions: [Permission.ReportsRead],
    flags: [FeatureFlag.NewReports],
  }),
  description: 'Lists the report runs, with filters and pagination.',
});

/** `GET /v1/reports/runs/{runId}`: detail of a run with its result. */
export const GetRunRoute = defineRoute({
  id: ReportsRoute.GetRun,
  method: HttpMethod.Get,
  path: '/v1/reports/runs/{runId}',
  request: GetReportRunRequestSchema,
  response: ReportRunDetailSchema,
  errors: [...guard, ReportsErrorCode.RunNotFound],
  access: Access.authenticated({
    permissions: [Permission.ReportsRead],
    flags: [FeatureFlag.NewReports],
  }),
  description: 'Gets a report run and its result.',
});

/** `GET /v1/reports/runs/{runId}/download`: downloads the ready result. */
export const DownloadRunRoute = defineRoute({
  id: ReportsRoute.DownloadRun,
  method: HttpMethod.Get,
  path: '/v1/reports/runs/{runId}/download',
  request: DownloadReportRunRequestSchema,
  response: ReportDownloadSchema,
  errors: [
    ...guard,
    ReportsErrorCode.RunNotFound,
    ReportsErrorCode.RunNotReady,
    ReportsErrorCode.RunExpired,
  ],
  access: Access.authenticated({
    permissions: [Permission.ReportsRead],
    flags: [FeatureFlag.NewReports],
  }),
  description: 'Downloads the result of a ready run in its format.',
});
