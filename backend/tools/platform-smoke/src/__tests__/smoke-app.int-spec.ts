import {
  DeleteMessageBatchCommand,
  GetQueueUrlCommand,
  PublishCommand,
  ReceiveMessageCommand,
} from '@platform/adapters-aws/test-utils';
import { SqsPoller } from '@platform/adapters-aws';
import { SNS_CLIENT, SQS_CLIENT } from '@platform/adapters-aws/nest';
import { VALKEY_CLIENT } from '@platform/adapters-valkey/nest';
import { PollUntil } from '@platform/adapters-valkey/test-utils';
import { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { OutboxRelayJob } from '@platform/messaging';
import { RequestContextStore } from '@platform/observability';
import {
  CatalogDataSource,
  ShardDataSources,
  ShardedMigrationRunner,
} from '@platform/persistence';
import { SagaStatus, Sagas } from '@platform/saga';
import { TenantStatus, type TenantPlacement } from '@platform/sharding';
import { Test, type TestingModule } from '@nestjs/testing';
import { ChangeSmokeOrderStatus } from '../orders/change-smoke-order-status.js';
import { RegisterSmokeOrder } from '../orders/register-smoke-order.js';
import { SmokeOrderCache } from '../orders/smoke-order-cache.js';
import { SmokeOrderLedger } from '../orders/smoke-order-ledger.js';
import { SmokeOrderStatus } from '../orders/smoke-order-status.enum.js';
import { SmokeStockHandlers } from '../orders/smoke-stock-handlers.js';
import { SmokeWelcomeSaga } from '../orders/smoke-welcome-saga.js';
import { SmokeAppModule } from '../smoke-app.module.js';
import {
  FakeSnsClient,
  FakeSqsClient,
  SmokeInfrastructure,
  SmokeTenantContext,
} from './utils/index.js';

jest.setTimeout(120_000);

const runtime = new ContainerRuntime(process.env);

/** Location of a tenant in a logical shard, as the directory stores it. */
function placement(tenantId: string, shard: string): TenantPlacement {
  return {
    tenantId,
    region: 'eu',
    shardGroup: [shard],
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
  };
}

runtime.describeIfAvailable(
  'Smoke application against Postgres shards, Valkey and fake AWS',
  () => {
    const infra = new SmokeInfrastructure();
    const sns = new FakeSnsClient();
    const sqs = new FakeSqsClient().on(GetQueueUrlCommand, (input) => ({
      QueueUrl: `https://sqs.local/${input.QueueName}`,
    }));
    let app: TestingModule;
    let tenants: SmokeTenantContext;
    let closed = false;

    function published(): string[] {
      return sns
        .sentOf(PublishCommand)
        .map(
          (command) => (command.input as { Message?: string }).Message ?? '',
        );
    }

    async function publishedFor(orderId: string): Promise<string> {
      await app.get(OutboxRelayJob, { strict: false }).run();
      await PollUntil.run(() =>
        published().some((body) => body.includes(orderId)),
      );
      return published().find((body) => body.includes(orderId)) ?? '';
    }

    beforeAll(async () => {
      await infra.start();
      app = await Test.createTestingModule({
        imports: [SmokeAppModule.register(infra.environment())],
      })
        .overrideProvider(SNS_CLIENT)
        .useValue(sns)
        .overrideProvider(SQS_CLIENT)
        .useValue(sqs)
        .compile();

      const runner = app.get(ShardedMigrationRunner);
      await runner.migrateCatalog();
      const directory = app.get(TypeOrmDirectoryStore);
      await directory.setInstance(
        SmokeInfrastructure.SHARD_A,
        SmokeInfrastructure.INSTANCE,
      );
      await directory.setInstance(
        SmokeInfrastructure.SHARD_B,
        SmokeInfrastructure.INSTANCE,
      );
      await directory.putPlacement(
        placement(SmokeInfrastructure.TENANT_A, SmokeInfrastructure.SHARD_A),
        undefined,
      );
      await directory.putPlacement(
        placement(SmokeInfrastructure.TENANT_B, SmokeInfrastructure.SHARD_B),
        undefined,
      );
      await runner.migrateAll();

      await app.init();
      tenants = new SmokeTenantContext(app.get(RequestContextStore));
    }, 300_000);

    afterAll(async () => {
      if (!closed) {
        await app?.close();
      }
      await infra.stop();
    });

    it('stores the order and its event in the same transaction, or neither', async () => {
      const register = app.get(RegisterSmokeOrder);
      const before = await infra.rows(
        SmokeInfrastructure.SHARD_A,
        'SELECT count(*)::int AS n FROM outbox',
      );

      await tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
        register.execute({
          tenantId: SmokeInfrastructure.TENANT_A,
          customer: 'Ana',
        }),
      );
      const afterCommit = await infra.rows(
        SmokeInfrastructure.SHARD_A,
        'SELECT count(*)::int AS n FROM outbox',
      );
      expect(afterCommit[0]?.['n']).toBe(Number(before[0]?.['n']) + 1);

      const tooLong = 'x'.repeat(121);
      await expect(
        tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
          register.execute({
            tenantId: SmokeInfrastructure.TENANT_A,
            customer: tooLong,
          }),
        ),
      ).rejects.toThrow();
      const afterRollback = await infra.rows(
        SmokeInfrastructure.SHARD_A,
        'SELECT count(*)::int AS n FROM outbox',
      );
      expect(afterRollback[0]?.['n']).toBe(afterCommit[0]?.['n']);
      const orders = await infra.rows(
        SmokeInfrastructure.SHARD_A,
        'SELECT id, status FROM smoke_orders',
      );
      expect(
        orders.every((row) => row['status'] === SmokeOrderStatus.Placed),
      ).toBe(true);
    });

    it('publishes an event only after its transaction committed', async () => {
      const register = app.get(RegisterSmokeOrder);
      const rejected = 'y'.repeat(121);

      await expect(
        tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
          register.execute({
            tenantId: SmokeInfrastructure.TENANT_A,
            customer: rejected,
          }),
        ),
      ).rejects.toThrow();
      const order = await tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
        register.execute({
          tenantId: SmokeInfrastructure.TENANT_A,
          customer: 'Bruno',
        }),
      );

      const body = await publishedFor(order.id);
      expect(JSON.parse(body)).toMatchObject({
        data: { orderId: order.id, customer: 'Bruno' },
      });
      expect(published().some((sent) => sent.includes(rejected))).toBe(false);
    });

    it('counts one handled delivery when SQS hands the same message twice', async () => {
      const order = await tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
        app.get(RegisterSmokeOrder).execute({
          tenantId: SmokeInfrastructure.TENANT_A,
          customer: 'Dani',
        }),
      );
      const body = await publishedFor(order.id);
      const envelopeId = (JSON.parse(body) as { id: string }).id;
      const poller = app.get(SqsPoller, { strict: false });
      const ledger = app.get(SmokeOrderLedger);
      sqs
        .once(ReceiveMessageCommand, () => ({
          Messages: [
            {
              MessageId: 'm-1',
              ReceiptHandle: 'r-1',
              Body: body,
              Attributes: { ApproximateReceiveCount: '1' },
            },
          ],
        }))
        .once(ReceiveMessageCommand, () => ({
          Messages: [
            {
              MessageId: 'm-1',
              ReceiptHandle: 'r-2',
              Body: body,
              Attributes: { ApproximateReceiveCount: '2' },
            },
          ],
        }));

      await tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
        poller.pollOnce(),
      );
      await tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
        poller.pollOnce(),
      );

      expect(ledger.countOf(envelopeId)).toBe(1);
      expect(
        sqs.sentOf(DeleteMessageBatchCommand).length,
      ).toBeGreaterThanOrEqual(2);
    });

    it('completes the welcome saga when every step succeeds', async () => {
      const sagas = app.get(Sagas);

      const instance = await tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
        sagas.start(SmokeWelcomeSaga, {
          orderId: 'order-ok',
          failVerify: false,
        }),
      );

      expect(instance.status).toBe(SagaStatus.Completed);
    });

    it('compensates the first step when the second one fails', async () => {
      const sagas = app.get(Sagas);
      const stock = app.get(SmokeStockHandlers);

      const instance = await tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
        sagas.start(SmokeWelcomeSaga, {
          orderId: 'order-fail',
          failVerify: true,
        }),
      );

      expect(instance.status).toBe(SagaStatus.Compensated);
      expect(stock.isReserved('order-fail')).toBe(false);
    });

    it('serves the new status after a committed update', async () => {
      const register = app.get(RegisterSmokeOrder);
      const change = app.get(ChangeSmokeOrderStatus);
      const cache = app.get(SmokeOrderCache);
      const order = await tenants.runAs(SmokeInfrastructure.TENANT_A, () =>
        register.execute({
          tenantId: SmokeInfrastructure.TENANT_A,
          customer: 'Caro',
        }),
      );

      await tenants.runAs(SmokeInfrastructure.TENANT_A, async () => {
        expect(
          (await cache.read(SmokeInfrastructure.TENANT_A, order.id))?.status,
        ).toBe(SmokeOrderStatus.Placed);
        await change.execute({
          tenantId: SmokeInfrastructure.TENANT_A,
          orderId: order.id,
          status: SmokeOrderStatus.Paid,
        });
        expect(
          (await cache.read(SmokeInfrastructure.TENANT_A, order.id))?.status,
        ).toBe(SmokeOrderStatus.Paid);
      });
    });

    it('stops polling before closing the clients and releases every resource on close', async () => {
      const valkey = app.get<{ status: string }>(VALKEY_CLIENT);
      const shards = app.get(ShardDataSources);
      const catalog = app.get(CatalogDataSource);
      const catalogSource = await catalog.get();
      expect(shards.activeShards().length).toBeGreaterThan(0);

      closed = true;
      await app.close();

      expect(sns.closes).toBe(1);
      expect(sqs.closes).toBe(1);
      expect(sqs.pendingReceivesAtClose).toBe(0);
      expect(shards.activeShards()).toEqual([]);
      expect(catalogSource.isInitialized).toBe(false);
      await PollUntil.run(() => valkey.status === 'end');
    });
  },
);
