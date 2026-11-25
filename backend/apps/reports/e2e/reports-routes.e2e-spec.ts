import { FeatureFlag, Permission } from '@contracts/identity';
import { PlatformErrorCode, type RouteDefinition } from '@contracts/platform';
import {
  ReportFormat,
  ReportGranularity,
  ReportsCommand,
  ReportsErrorCode,
  ReportsRoute,
  ReportType,
  reportsContract,
  type ReportCatalog,
  type ReportRunCreated,
} from '@contracts/reports';
import type { HttpTestClient } from '@platform/http/test-utils';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { ReportsTestApp } from '../src/__tests__/utils/index.js';

const ANA = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const OUTSIDER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b07';
const FLAG_OFF = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b08';
/** One member per route: the service caches access by permission version and does not request it again. */
const exactAccessMember = (index: number) =>
  `0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9c${String(index).padStart(2, '0')}`;
const ROUTES: readonly RouteDefinition[] = Object.values(
  reportsContract.routes,
);
const TENANT = ReportsTestApp.TENANT_A;
const NEW_RUN = {
  type: ReportType.TasksActivity,
  format: ReportFormat.Json,
  params: {
    from: '2026-11-01',
    to: '2026-11-30',
    granularity: ReportGranularity.Week,
  },
};

new ContainerRuntime(process.env).describeIfAvailable(
  'reports routes end to end',
  () => {
    jest.setTimeout(300_000);
    const app = new ReportsTestApp();
    let readyRunId: string;

    beforeAll(async () => {
      await app.start();
      const ana = await app.clientOf({ userId: ANA, tenantId: TENANT });
      const created = await ana.post('/v1/reports/runs', { body: NEW_RUN });
      readyRunId = (created.body as ReportRunCreated).runId;
      await app.deliverOutbox(TENANT, ReportsCommand.ExecuteRun);
    });

    afterAll(async () => {
      await app.stop();
    });

    const call = (client: HttpTestClient, route: RouteDefinition) =>
      client.send(route.method, route.path.replace('{runId}', readyRunId), {
        body: route.id === ReportsRoute.CreateRun ? NEW_RUN : undefined,
      });

    describe('access matrix', () => {
      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s answers 401 without a token',
        async (_id, route) => {
          const response = await call(app.anonymous(), route);

          expect(response.status).toBe(401);
        },
      );

      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s answers 403 to a member without its permission',
        async (_id, route) => {
          const member = await app.clientOf({
            userId: OUTSIDER,
            tenantId: TENANT,
            permissions: [],
          });

          const response = await call(member, route);

          expect(response.status).toBe(403);
          expect(response.body).toMatchObject({
            code: PlatformErrorCode.AuthForbidden,
          });
        },
      );

      it.each(ROUTES.map((route) => [route.id, route] as const))(
        '%s answers 404 while the new reports flag is off',
        async (_id, route) => {
          const member = await app.clientOf({
            userId: FLAG_OFF,
            tenantId: TENANT,
            flags: [],
          });

          const response = await call(member, route);

          expect(response.status).toBe(404);
          expect(response.body).toMatchObject({
            code: PlatformErrorCode.AccessFlagDisabled,
          });
        },
      );

      it.each(ROUTES.map((route, index) => [route.id, route, index] as const))(
        '%s lets in a member with exactly its permissions and the flag on',
        async (_id, route, index) => {
          const member = await app.clientOf({
            userId: exactAccessMember(index),
            tenantId: TENANT,
            permissions: Object.values(Permission).filter((permission) =>
              (route.access.permissions ?? []).includes(permission),
            ),
            flags: [FeatureFlag.NewReports],
          });

          const response = await call(member, route);

          expect(response.status).toBeLessThan(300);
        },
      );
    });

    it('lists the four reports of the template in JSON and CSV', async () => {
      const ana = await app.clientOf({ userId: ANA, tenantId: TENANT });

      const catalog = (await ana.get('/v1/reports')).body as ReportCatalog;

      expect(catalog.items.map((entry) => entry.type)).toEqual(
        Object.values(ReportType),
      );
      expect(catalog.items[0]?.formats).toEqual([
        ReportFormat.Json,
        ReportFormat.Csv,
      ]);
    });

    it('answers 404 to a run of another tenant', async () => {
      const other = await app.clientOf({
        userId: ANA,
        tenantId: ReportsTestApp.TENANT_B,
      });

      const response = await other.get(`/v1/reports/runs/${readyRunId}`);

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        code: ReportsErrorCode.RunNotFound,
      });
    });
  },
);
