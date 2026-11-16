import {
  AccessKind,
  HttpMethod,
  PlatformErrorCode,
  QueryParamsCodec,
  validateContract,
} from '@contracts/platform';
import {
  FeatureFlag,
  Permission,
  SessionGuardErrors,
} from '@contracts/identity';
import { reportsContract } from '../contract.js';
import { ReportsErrorCode, ReportsRoute } from '../enums/identifiers.enum.js';
import {
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportType,
} from '../enums/reports.enum.js';
import { Ids, Result, RunSummary, UuidV4 } from './utils/fixtures.js';

const guard = [...SessionGuardErrors, PlatformErrorCode.AccessFlagDisabled];

const cases = [
  {
    id: ReportsRoute.ListCatalog,
    route: reportsContract.routes.listCatalog,
    method: HttpMethod.Get,
    path: '/v1/reports',
    successStatus: 200,
    permission: Permission.ReportsRead,
  },
  {
    id: ReportsRoute.CreateRun,
    route: reportsContract.routes.createRun,
    method: HttpMethod.Post,
    path: '/v1/reports/runs',
    successStatus: 202,
    permission: Permission.ReportsWrite,
  },
  {
    id: ReportsRoute.ListRuns,
    route: reportsContract.routes.listRuns,
    method: HttpMethod.Get,
    path: '/v1/reports/runs',
    successStatus: 200,
    permission: Permission.ReportsRead,
  },
  {
    id: ReportsRoute.GetRun,
    route: reportsContract.routes.getRun,
    method: HttpMethod.Get,
    path: '/v1/reports/runs/{runId}',
    successStatus: 200,
    permission: Permission.ReportsRead,
  },
  {
    id: ReportsRoute.DownloadRun,
    route: reportsContract.routes.downloadRun,
    method: HttpMethod.Get,
    path: '/v1/reports/runs/{runId}/download',
    successStatus: 200,
    permission: Permission.ReportsRead,
  },
] as const;

describe('reports routes', () => {
  it.each(cases.map((item) => [item.id, item] as const))(
    'declares %s with its method, path and status',
    (_id, item) => {
      expect(item.route.id).toBe(item.id);
      expect(item.route.method).toBe(item.method);
      expect(item.route.path).toBe(item.path);
      expect(item.route.successStatus).toBe(item.successStatus);
    },
  );

  it.each(cases.map((item) => [item.id, item] as const))(
    'guards %s with the permission and the reports flag',
    (_id, item) => {
      expect(item.route.access).toMatchObject({
        kind: AccessKind.Authenticated,
        permissions: [item.permission],
        flags: [FeatureFlag.NewReports],
      });
      expect(item.route.access.features).toBeUndefined();
    },
  );

  it.each(cases.map((item) => [item.id, item] as const))(
    'answers the session and flag errors on %s',
    (_id, item) => {
      for (const code of guard) {
        expect(item.route.errors).toContain(code);
      }
    },
  );

  it('uses every ReportsRoute value exactly once', () => {
    const used = Object.values(reportsContract.routes).map((r) => r.id);
    expect([...used].sort()).toEqual(Object.values(ReportsRoute).sort());
  });

  it('serves the run detail and download with the run id in the path', () => {
    expect(reportsContract.routes.getRun.pathParams).toEqual(['runId']);
    expect(reportsContract.routes.downloadRun.pathParams).toEqual(['runId']);
  });

  it('declares the CSV feature check and the run errors on create and download', () => {
    expect(reportsContract.routes.createRun.errors).toEqual(
      expect.arrayContaining([
        PlatformErrorCode.AccessFeatureNotIncluded,
        ReportsErrorCode.TypeUnknown,
        ReportsErrorCode.ParamsInvalidRange,
      ]),
    );
    expect(reportsContract.routes.downloadRun.errors).toEqual(
      expect.arrayContaining([
        ReportsErrorCode.RunNotFound,
        ReportsErrorCode.RunNotReady,
        ReportsErrorCode.RunExpired,
      ]),
    );
  });

  it('declares no plan features on any route', () => {
    for (const route of Object.values(reportsContract.routes)) {
      expect(route.access.features).toBeUndefined();
    }
  });

  describe('create run request', () => {
    const { request } = reportsContract.routes.createRun;
    const valid = {
      type: ReportType.TasksByStatus,
      format: ReportFormat.Csv,
      params: {
        from: '2026-11-01',
        to: '2026-11-30',
        granularity: ReportGranularity.Day,
      },
    };

    it('accepts a valid request', () => {
      expect(validateContract(request, valid).ok).toBe(true);
    });

    it.each([
      [
        'a date in another format',
        { ...valid, params: { ...valid.params, from: '2026/11/01' } },
      ],
      ['an unknown format', { ...valid, format: 'pdf' }],
      [
        'an unknown granularity',
        { ...valid, params: { ...valid.params, granularity: 'year' } },
      ],
      ['missing params', { type: valid.type, format: valid.format }],
      ['an unknown field', { ...valid, requestedBy: Ids.user }],
    ])('rejects %s', (_name, body) => {
      expect(validateContract(request, body).ok).toBe(false);
    });
  });

  describe('list runs query', () => {
    const route = reportsContract.routes.listRuns;

    it('declares the filters and the pagination as query params', () => {
      expect(route.queryParams.map((p) => p.name)).toEqual([
        'type',
        'status',
        'limit',
        'after',
      ]);
    });

    it('decodes and validates a filtered query', () => {
      const decoded = new QueryParamsCodec().decode(route, {
        type: ReportType.TasksByStatus,
        status: ReportRunStatus.Ready,
        limit: '10',
      });
      expect(validateContract(route.request, decoded).ok).toBe(true);
    });
  });

  describe('run detail response', () => {
    const detail = reportsContract.schemas.ReportRunDetail;

    it('accepts a finished run with its result', () => {
      expect(
        validateContract(detail, { ...RunSummary, result: Result }).ok,
      ).toBe(true);
    });

    it('accepts a run without result yet', () => {
      expect(validateContract(detail, { ...RunSummary, result: null }).ok).toBe(
        true,
      );
    });

    it('rejects a run id that is not a v7 identifier', () => {
      expect(
        validateContract(reportsContract.routes.getRun.request, {
          runId: UuidV4,
        }).ok,
      ).toBe(false);
    });
  });
});
