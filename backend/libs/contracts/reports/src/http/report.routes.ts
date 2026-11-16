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

/** `GET /v1/reports`: catálogo de reportes disponibles para el tenant. */
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
  description: 'Lista los tipos de reporte, con sus formatos y granularidades.',
});

/**
 * `POST /v1/reports/runs`: pide una ejecución. El CSV exige la funcionalidad
 * advanced_reports y la comprueba el caso de uso, porque depende del cuerpo y no
 * de la ruta.
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
  description: 'Crea una ejecución de reporte. Responde 202 con su id.',
});

/** `GET /v1/reports/runs`: ejecuciones del tenant, más nuevas primero. */
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
  description: 'Lista las ejecuciones de reporte, con filtros y paginación.',
});

/** `GET /v1/reports/runs/{runId}`: detalle de una ejecución con su resultado. */
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
  description: 'Consulta una ejecución de reporte y su resultado.',
});

/** `GET /v1/reports/runs/{runId}/download`: descarga el resultado listo. */
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
  description: 'Descarga el resultado de una ejecución lista en su formato.',
});
