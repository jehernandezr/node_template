import {
  IdentityEmailTemplate,
  IdentityJourney,
  StartTenantMove,
  TenantAccessSetup,
  TenantMoveStatus,
  type SessionTokensBody,
} from '@apps/identity/test-utils';
import {
  InvoiceStatus,
  SubscriptionStatus,
  type InvoicePage,
  type Subscription,
} from '@contracts/billing';
import {
  IdentitySagaStatus,
  TenantLifecycle,
  TenantRole,
  type SagaSummary,
  type TenantCreation,
} from '@contracts/identity';
import {
  NotificationType,
  type NotificationPage,
} from '@contracts/notifications';
import {
  ReportFormat,
  ReportGranularity,
  ReportRunStatus,
  ReportType,
  type ReportRunCreated,
  type ReportRunDetail,
} from '@contracts/reports';
import { TaskStatus, type Task, type TaskPage } from '@contracts/tasks';
import type {
  HttpTestClient,
  HttpTestResponse,
} from '@platform/http/test-utils';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  PlatformApp,
  PlatformEnvironment,
  PlatformService,
} from './utils/index.js';

/** Una tabla que el traslado debe llevar al shard de destino, con la columna que la ata al tenant o al miembro. */
interface MovedTable {
  readonly service: PlatformService;
  readonly table: string;
  readonly columns: string;
  readonly ownedBy: 'tenant_id' | 'home_tenant_id' | 'user_id';
}

const SERVICES = Object.values(PlatformService);

const MOVED_TABLES: readonly MovedTable[] = [
  {
    service: PlatformService.Identity,
    table: 'tenants',
    columns: 'id, status',
    ownedBy: 'tenant_id',
  },
  {
    service: PlatformService.Identity,
    table: 'users',
    columns: 'id',
    ownedBy: 'home_tenant_id',
  },
  {
    service: PlatformService.Tasks,
    table: 'tasks',
    columns: 'id, status, version',
    ownedBy: 'tenant_id',
  },
  {
    service: PlatformService.Notifications,
    table: 'notifications',
    columns: 'id, type',
    ownedBy: 'user_id',
  },
  {
    service: PlatformService.Reports,
    table: 'report_runs',
    columns: 'id, status',
    ownedBy: 'tenant_id',
  },
  {
    service: PlatformService.Reports,
    table: 'proj_tasks',
    columns: 'task_id, status',
    ownedBy: 'tenant_id',
  },
  {
    service: PlatformService.Billing,
    table: 'subscriptions',
    columns: 'id, status',
    ownedBy: 'tenant_id',
  },
  {
    service: PlatformService.Billing,
    table: 'invoices',
    columns: 'id, status, total_minor',
    ownedBy: 'tenant_id',
  },
];

new ContainerRuntime(process.env).describeIfAvailable(
  'platform flow end to end',
  () => {
    jest.setTimeout(600_000);

    const app = new PlatformApp();
    let olga: IdentityJourney;
    let bruno: IdentityJourney;
    let tenantId: string;
    let owner: string;
    let member: string;
    let doneTaskId: string;
    let runId: string;

    /** El access token de una sesión del usuario, pasado al tenant de la prueba. */
    const tokenIn = async (
      journey: IdentityJourney,
      session: SessionTokensBody,
    ): Promise<string> => {
      const switched = await journey
        .bearer(session.accessToken)
        .post('/v1/me/tenant-switch', { body: { tenantId } });
      IdentityJourney.expectStatus(switched, 200);
      return (switched.body as SessionTokensBody).accessToken;
    };
    const callAs = (
      service: PlatformService,
      accessToken: string,
    ): HttpTestClient => app.node(service).clientOf(accessToken);
    /** Las filas del tenant en el shard donde hoy lo tiene el directorio del servicio. */
    const rowsOf = (service: PlatformService, table: string, columns: string) =>
      app
        .node(service)
        .rowsOf<Record<string, unknown>>(
          tenantId,
          `SELECT ${columns} FROM ${table} WHERE tenant_id = '${tenantId}' ORDER BY 1`,
        );
    /** La consulta de una tabla del traslado: las filas del tenant o, en las tablas por usuario, las del miembro. */
    const movedRowsSql = ({ table, columns, ownedBy }: MovedTable) =>
      `SELECT ${columns} FROM ${table} WHERE ${ownedBy} = '${ownedBy === 'user_id' ? IdentityJourney.userIdFrom(member) : tenantId}' ORDER BY 1`;
    /** Las filas de una tabla del traslado leídas directamente en uno de los dos shards de su servicio. */
    const movedRowsIn = (moved: MovedTable, shard: 0 | 1) =>
      app
        .node(moved.service)
        .databases.shards()
        [shard].rows<Record<string, unknown>>(movedRowsSql(moved));
    /** La posición, en los shards de cada servicio, del shard donde su directorio tiene hoy al tenant. */
    const shardIndexes = () =>
      Promise.all(
        SERVICES.map(async (service) => {
          const node = app.node(service);
          const shard = await node.shardOf(tenantId);
          return node.databases
            .shards()
            .findIndex((candidate) => candidate.database === shard.database);
        }),
      );
    const notificationsOf = async (accessToken: string) => {
      const inbox: HttpTestResponse = await callAs(
        PlatformService.Notifications,
        accessToken,
      ).get('/v1/notifications');
      return (inbox.body as NotificationPage).items.map((item) => item.type);
    };

    beforeAll(async () => {
      await app.start();
      olga = new IdentityJourney(app.identity(), 'olga.flujo@example.com');
      bruno = new IdentityJourney(app.identity(), 'bruno.flujo@example.com');
      await olga.register();
    });

    afterAll(async () => {
      await app.stop();
    });

    it('opens a tenant with the onboarding saga, placing it in the same shard group of every service', async () => {
      const olgaSession = await olga.signInWithEmailCode();

      const created = await olga
        .bearer(olgaSession.accessToken)
        .post('/v1/tenants', { body: { slug: 'acme-flujo', name: 'Acme' } });
      ({ tenantId } = created.body as TenantCreation);
      const saga = await olga
        .bearer(olgaSession.accessToken)
        .get(`/v1/sagas/${(created.body as TenantCreation).sagaId}`);
      await app.settle();
      owner = await tokenIn(olga, olgaSession);
      const tenant = await olga.bearer(owner).get('/v1/tenant');
      const subscription = await callAs(PlatformService.Billing, owner).get(
        '/v1/billing/subscription',
      );

      expect(created.status).toBe(202);
      expect((saga.body as SagaSummary).status).toBe(
        IdentitySagaStatus.Completed,
      );
      expect(tenant.body).toMatchObject({
        id: tenantId,
        status: TenantLifecycle.Active,
      });
      expect(subscription.status).toBe(200);
      expect((subscription.body as Subscription).status).toBe(
        SubscriptionStatus.Trialing,
      );
      expect(await notificationsOf(owner)).toContain(
        NotificationType.AccountActivity,
      );
      expect(new Set(await shardIndexes()).size).toBe(1);
    });

    it('lets an invited member into the tenant', async () => {
      const groups = await olga.bearer(owner).get('/v1/tenant/groups');
      const members = (
        groups.body as { items: Array<{ id: string; name: string }> }
      ).items.find(
        (group) =>
          group.name === TenantAccessSetup.SYSTEM_NAMES[TenantRole.Member],
      );

      const invited = await olga.bearer(owner).post('/v1/tenant/invitations', {
        body: { email: bruno.email, groupIds: [members?.id] },
      });
      const signUp = await bruno.signUp(
        bruno.mailTo(IdentityEmailTemplate.TenantInvitation)['token'],
      );
      member = await tokenIn(bruno, await bruno.signInWithEmailCode());

      expect(invited.status).toBe(201);
      expect(signUp.status).toBe(202);
    });

    it('notifies the author when someone else completes a task', async () => {
      const first = await callAs(PlatformService.Tasks, member).post(
        '/v1/tasks',
        {
          body: { title: 'Preparar el informe' },
        },
      );
      const second = await callAs(PlatformService.Tasks, member).post(
        '/v1/tasks',
        { body: { title: 'Revisar contratos' } },
      );
      doneTaskId = (first.body as Task).id;

      const completed = await callAs(PlatformService.Tasks, owner).patch(
        `/v1/tasks/${doneTaskId}`,
        { body: { status: TaskStatus.Done } },
      );
      await app.settle();

      expect([first.status, second.status, completed.status]).toEqual([
        201, 201, 200,
      ]);
      expect(
        await rowsOf(PlatformService.Tasks, 'tasks', 'id, status'),
      ).toEqual(
        expect.arrayContaining([
          { id: doneTaskId, status: TaskStatus.Done },
          { id: (second.body as Task).id, status: TaskStatus.Open },
        ]),
      );
      expect(await notificationsOf(member)).toContain(
        NotificationType.TaskUpdated,
      );
    });

    it('reflects the tasks in the reports projection', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 86_400_000);

      const created = await callAs(PlatformService.Reports, owner).post(
        '/v1/reports/runs',
        {
          body: {
            type: ReportType.TasksByStatus,
            format: ReportFormat.Json,
            params: {
              from: yesterday.toISOString().slice(0, 10),
              to: today.toISOString().slice(0, 10),
              granularity: ReportGranularity.Day,
            },
          },
        },
      );
      runId = (created.body as ReportRunCreated).runId;
      await app.settle();
      const run = await callAs(PlatformService.Reports, owner).get(
        `/v1/reports/runs/${runId}`,
      );

      expect(created.status).toBe(202);
      expect((run.body as ReportRunDetail).status).toBe(ReportRunStatus.Ready);
      expect((run.body as ReportRunDetail).result?.rows).toEqual([
        { cells: [TaskStatus.Open, '1'] },
        { cells: [TaskStatus.InProgress, '0'] },
        { cells: [TaskStatus.Done, '1'] },
      ]);
      expect(
        await rowsOf(PlatformService.Reports, 'proj_tasks', 'task_id'),
      ).toHaveLength(2);
    });

    it('closes the billing period with an invoice that reaches notifications and reports', async () => {
      await (
        await app.node(PlatformService.Billing).shardOf(tenantId)
      ).query(
        `UPDATE subscriptions SET status = '${SubscriptionStatus.Active}', period_start = '2026-01-01', period_end = '2026-01-31' WHERE tenant_id = '${tenantId}'`,
      );

      await app.closeInvoicePeriods();
      await app.settle();
      const invoices = await callAs(PlatformService.Billing, owner).get(
        '/v1/billing/invoices',
      );

      expect((invoices.body as InvoicePage).items).toEqual([
        expect.objectContaining({
          period: { start: '2026-01-01', end: '2026-01-31' },
        }),
      ]);
      expect((invoices.body as InvoicePage).items[0]?.status).not.toBe(
        InvoiceStatus.Draft,
      );
      expect(await notificationsOf(owner)).toContain(
        NotificationType.InvoiceIssued,
      );
      expect(
        await rowsOf(PlatformService.Reports, 'proj_invoices', 'id'),
      ).toHaveLength(1);
    });

    it('moves the tenant to the other shard group in every service without losing a row', async () => {
      const origins = await shardIndexes();
      const origin = origins[0] === 1 ? 1 : 0;
      const target = origin === 0 ? 1 : 0;
      const before = await Promise.all(
        MOVED_TABLES.map((moved) => movedRowsIn(moved, origin)),
      );

      const launch = await app
        .node(PlatformService.Identity)
        .get(StartTenantMove)
        .execute({
          tenantId,
          targetGroup: PlatformEnvironment.MOVE_GROUPS[target],
        });
      await app.settle();
      const [move] = await app
        .node(PlatformService.Identity)
        .databases.catalog()
        .rows<{
          status: string;
        }>(
          `SELECT status FROM tenant_moves WHERE move_id = '${launch.moveId}'`,
        );
      const fences = await Promise.all(
        SERVICES.map((service) =>
          app
            .node(service)
            .databases.shards()
            [origin].rows(
              `SELECT move_id, switched_at IS NOT NULL AS switched FROM tenant_write_fences WHERE tenant_id = '${tenantId}'`,
            ),
        ),
      );
      const inTarget = await Promise.all(
        MOVED_TABLES.map((moved) => movedRowsIn(moved, target)),
      );
      const tasks = await callAs(PlatformService.Tasks, member).get(
        '/v1/tasks',
      );
      const run = await callAs(PlatformService.Reports, owner).get(
        `/v1/reports/runs/${runId}`,
      );

      expect(move?.status).toBe(TenantMoveStatus.Switched);
      expect(origins).toEqual(SERVICES.map(() => origin));
      await expect(shardIndexes()).resolves.toEqual(SERVICES.map(() => target));
      expect(before.every((rows) => rows.length > 0)).toBe(true);
      expect(inTarget).toEqual(before);
      expect(fences).toEqual(
        SERVICES.map(() => [{ move_id: launch.moveId, switched: true }]),
      );
      expect((tasks.body as TaskPage).items.map((task) => task.id)).toContain(
        doneTaskId,
      );
      expect((run.body as ReportRunDetail).status).toBe(ReportRunStatus.Ready);
      expect(await notificationsOf(member)).toContain(
        NotificationType.TaskUpdated,
      );
    });
  },
);
