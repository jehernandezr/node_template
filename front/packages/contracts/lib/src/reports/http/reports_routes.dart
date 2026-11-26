// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import '../../core/core.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';
import '../../platform/types/platform_types.dart';
import '../../reports/schemas/reports_schemas.dart';
import '../../reports/types/reports_types.dart';

/// Public HTTP routes of the `reports` contract.
abstract final class ReportsRoutes {
  /// Lists the report types, with their formats and granularities.
  ///
  /// `GET /v1/reports`
  static const listCatalog = RouteDescriptor<Empty, ReportCatalog>(
    id: 'reports.catalog.list',
    method: HttpMethod.get,
    path: '/v1/reports',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.ACCESS.FLAG_DISABLED',
    ],
    requiresAuth: true,
    permissions: <String>['reports:read'],
    platformRoles: <String>[],
    flags: <String>['new_reports'],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: ReportCatalogSchema.validateIncoming,
    decodeResponse: ReportCatalog.fromJson,
  );

  /// Creates a report run. Responds 202 with its id.
  ///
  /// `POST /v1/reports/runs`
  static const createRun =
      RouteDescriptor<CreateReportRunRequest, ReportRunCreated>(
        id: 'reports.run.create',
        method: HttpMethod.post,
        path: '/v1/reports/runs',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 202,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'PLATFORM.ACCESS.FLAG_DISABLED',
          'PLATFORM.VALIDATION.INVALID_INPUT',
          'PLATFORM.ACCESS.FEATURE_NOT_INCLUDED',
          'REPORTS.TYPE.UNKNOWN',
          'REPORTS.PARAMS.INVALID_RANGE',
        ],
        requiresAuth: true,
        permissions: <String>['reports:write'],
        platformRoles: <String>[],
        flags: <String>['new_reports'],
        encodeRequest: CreateReportRunRequest.encode,
        validateRequest: CreateReportRunRequestSchema.validate,
        validateResponse: ReportRunCreatedSchema.validateIncoming,
        decodeResponse: ReportRunCreated.fromJson,
      );

  /// Lists the report runs, with filters and pagination.
  ///
  /// `GET /v1/reports/runs`
  static const listRuns = RouteDescriptor<ListReportRunsRequest, ReportRunPage>(
    id: 'reports.run.list',
    method: HttpMethod.get,
    path: '/v1/reports/runs',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.ACCESS.FLAG_DISABLED',
      'PLATFORM.VALIDATION.INVALID_INPUT',
    ],
    requiresAuth: true,
    permissions: <String>['reports:read'],
    platformRoles: <String>[],
    flags: <String>['new_reports'],
    encodeRequest: ListReportRunsRequest.encode,
    validateRequest: ListReportRunsRequestSchema.validate,
    validateResponse: ReportRunPageSchema.validateIncoming,
    decodeResponse: ReportRunPage.fromJson,
  );

  /// Gets a report run and its result.
  ///
  /// `GET /v1/reports/runs/{runId}`
  static const getRun = RouteDescriptor<GetReportRunRequest, ReportRunDetail>(
    id: 'reports.run.get',
    method: HttpMethod.get,
    path: '/v1/reports/runs/{runId}',
    version: 1,
    pathParams: <String>['runId'],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.ACCESS.FLAG_DISABLED',
      'REPORTS.RUN.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['reports:read'],
    platformRoles: <String>[],
    flags: <String>['new_reports'],
    encodeRequest: GetReportRunRequest.encode,
    validateRequest: GetReportRunRequestSchema.validate,
    validateResponse: ReportRunDetailSchema.validateIncoming,
    decodeResponse: ReportRunDetail.fromJson,
  );

  /// Downloads the result of a ready run in its format.
  ///
  /// `GET /v1/reports/runs/{runId}/download`
  static const downloadRun =
      RouteDescriptor<DownloadReportRunRequest, ReportDownload>(
        id: 'reports.run.download',
        method: HttpMethod.get,
        path: '/v1/reports/runs/{runId}/download',
        version: 1,
        pathParams: <String>['runId'],
        requestLocation: RequestLocation.query,
        successStatus: 200,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'PLATFORM.ACCESS.FLAG_DISABLED',
          'REPORTS.RUN.NOT_FOUND',
          'REPORTS.RUN.NOT_READY',
          'REPORTS.RUN.EXPIRED',
        ],
        requiresAuth: true,
        permissions: <String>['reports:read'],
        platformRoles: <String>[],
        flags: <String>['new_reports'],
        encodeRequest: DownloadReportRunRequest.encode,
        validateRequest: DownloadReportRunRequestSchema.validate,
        validateResponse: ReportDownloadSchema.validateIncoming,
        decodeResponse: ReportDownload.fromJson,
      );
}
