import {
  EraseTasksUserDataOperation,
  TasksErrorCode,
  TasksEvent,
  TasksTenantDirectoryOperations,
} from '@contracts/tasks';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import { ProvisionedService } from '@platform/service/test-utils';
import { TenantStatus } from '@platform/sharding';
import { TenantDirectoryRehearsal } from '@platform/tenant-move/test-utils';
import { TenantMoveErrorCode } from '@platform/tenant-move';
import { PurgeDeletedTasksJob } from '../modules/tasks/application/purge-deleted-tasks.job.js';
import { TasksDefaults } from '../shared/constants/tasks-defaults.constants.js';
import { TasksTestApp } from './utils/index.js';

const ANA = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01';
const BEA = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b02';

interface TaskBody {
  readonly id: string;
  readonly version: number;
}

new ContainerRuntime(process.env).describeIfAvailable(
  'tasks on two shards',
  () => {
    jest.setTimeout(300_000);
    const app = new TasksTestApp();
    const [shardA, shardB] = [0, 1] as const;

    beforeAll(async () => {
      await app.start();
    });

    afterAll(async () => {
      await app.stop();
    });

    const shardRows = (shard: 0 | 1, sql: string) =>
      app.servers.shards()[shard].rows<Record<string, unknown>>(sql);

    const createIn = async (
      tenantId: string,
      userId: string,
      title: string,
    ) => {
      const client = await app.clientOf({ userId, tenantId });
      const response = await client.post('/v1/tasks', { body: { title } });
      expect(response.status).toBe(201);
      return response.body as TaskBody;
    };

    it('keeps each tenant task, its search document and its event in the shard of the tenant', async () => {
      const inA = await createIn(
        TasksTestApp.TENANT_A,
        ANA,
        'Enviar la factura de marzo',
      );
      const inB = await createIn(
        TasksTestApp.TENANT_B,
        BEA,
        'Revisar el contrato',
      );

      await expect(
        shardRows(shardA, `SELECT id FROM tasks WHERE id = '${inA.id}'`),
      ).resolves.toHaveLength(1);
      await expect(
        shardRows(shardB, `SELECT id FROM tasks WHERE id = '${inA.id}'`),
      ).resolves.toHaveLength(0);
      await expect(
        shardRows(shardB, `SELECT id FROM tasks WHERE id = '${inB.id}'`),
      ).resolves.toHaveLength(1);
      await expect(
        shardRows(
          shardA,
          `SELECT 1 FROM search_documents WHERE document_id = '${inA.id}'`,
        ),
      ).resolves.toHaveLength(1);
      await expect(
        shardRows(
          shardB,
          `SELECT envelope->>'type' AS type FROM outbox WHERE envelope->'data'->>'taskId' = '${inB.id}'`,
        ),
      ).resolves.toEqual([{ type: TasksEvent.TaskCreated }]);
    });

    it('never shows a task to a member of another tenant', async () => {
      const inA = await createIn(TasksTestApp.TENANT_A, ANA, 'Solo de A');
      const fromB = await app.clientOf({
        userId: BEA,
        tenantId: TasksTestApp.TENANT_B,
      });

      const read = await fromB.get(`/v1/tasks/${inA.id}`);
      const listed = await fromB.get('/v1/tasks');

      expect(read.status).toBe(404);
      expect(read.body).toMatchObject({ code: TasksErrorCode.TaskNotFound });
      expect(
        (listed.body as { items: TaskBody[] }).items.map((task) => task.id),
      ).not.toContain(inA.id);
    });

    it('purges in every shard only the tasks deleted before the retention', async () => {
      const oldInA = await createIn(TasksTestApp.TENANT_A, ANA, 'Vieja en A');
      const oldInB = await createIn(TasksTestApp.TENANT_B, BEA, 'Vieja en B');
      const recent = await createIn(
        TasksTestApp.TENANT_A,
        ANA,
        'Recién borrada',
      );
      for (const [tenantId, userId, id] of [
        [TasksTestApp.TENANT_A, ANA, oldInA.id],
        [TasksTestApp.TENANT_B, BEA, oldInB.id],
        [TasksTestApp.TENANT_A, ANA, recent.id],
      ] as const) {
        const client = await app.clientOf({ userId, tenantId });
        expect((await client.delete(`/v1/tasks/${id}`)).status).toBe(204);
      }
      await app.servers
        .shards()
        [shardA].query(
          `UPDATE tasks SET deleted_at = now() - interval '${TasksDefaults.deletedRetentionDays + 1} days' WHERE id = '${oldInA.id}'`,
        );
      await app.servers
        .shards()
        [shardB].query(
          `UPDATE tasks SET deleted_at = now() - interval '${TasksDefaults.deletedRetentionDays + 1} days' WHERE id = '${oldInB.id}'`,
        );

      await app.get(PurgeDeletedTasksJob).run();

      await expect(
        shardRows(
          shardA,
          `SELECT id FROM tasks WHERE id IN ('${oldInA.id}', '${recent.id}')`,
        ),
      ).resolves.toEqual([{ id: recent.id }]);
      await expect(
        shardRows(shardB, `SELECT id FROM tasks WHERE id = '${oldInB.id}'`),
      ).resolves.toEqual([]);
    });

    it('erases a user as author in every tenant and repeats without changing anything else', async () => {
      const erased = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b09';
      const inA = await createIn(
        TasksTestApp.TENANT_A,
        erased,
        'De la persona borrada en A',
      );
      const inB = await createIn(
        TasksTestApp.TENANT_B,
        erased,
        'De la persona borrada en B',
      );
      const input = {
        user: { userId: erased, homeTenantId: TasksTestApp.TENANT_A },
      };

      const first = await app
        .internal()
        .invoke(EraseTasksUserDataOperation, input);
      const again = await app
        .internal()
        .invoke(EraseTasksUserDataOperation, input);

      expect(first).toEqual({
        kind: CallOutcomeKind.Success,
        value: { userId: erased, affectedRows: 2 },
      });
      expect(again).toMatchObject({ value: { affectedRows: 0 } });
      const client = await app.clientOf({
        userId: ANA,
        tenantId: TasksTestApp.TENANT_A,
      });
      expect((await client.get(`/v1/tasks/${inA.id}`)).body).toMatchObject({
        createdBy: TasksDefaults.erasedAuthor,
      });
      await expect(
        shardRows(
          shardB,
          `SELECT created_by FROM tasks WHERE id = '${inB.id}'`,
        ),
      ).resolves.toEqual([{ created_by: TasksDefaults.erasedAuthor.userId }]);
    });

    it('places a tenant onboarded by identity in the shard of its group once and takes it out when the onboarding is undone', async () => {
      const rehearsal = new TenantDirectoryRehearsal(
        TasksTenantDirectoryOperations,
        app.internal(),
        app.servers,
      );

      const report = await rehearsal.rehearse();

      expect(report.placements).toEqual([
        { kind: CallOutcomeKind.Success, value: { tenantId: report.tenantId } },
        { kind: CallOutcomeKind.Success, value: { tenantId: report.tenantId } },
      ]);
      expect(report.placedRows).toEqual([
        {
          region: ProvisionedService.REGION,
          shard_group: [rehearsal.expectedShard()],
          status: TenantStatus.Active,
        },
      ]);
      expect(report.removals).toEqual([
        { kind: CallOutcomeKind.Success, value: { tenantId: report.tenantId } },
        { kind: CallOutcomeKind.Success, value: { tenantId: report.tenantId } },
      ]);
      expect(report.rowsAfterRemoval).toEqual([]);
      expect(report.unknownGroup).toMatchObject({
        kind: CallOutcomeKind.ProtocolViolation,
        code: TenantMoveErrorCode.UnknownTarget,
      });
    });
  },
);
