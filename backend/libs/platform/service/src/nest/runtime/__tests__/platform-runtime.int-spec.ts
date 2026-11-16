import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import { HealthState, TransactionManager } from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { MessageBus, MessagingJob } from '@platform/messaging';
import { RecordingEnvelopePublisher } from '@platform/messaging/test-utils';
import { RequestContextStore } from '@platform/observability';
import { ShardedMigrationRunner } from '@platform/persistence';
import { JobRunner, SchedulingMode } from '@platform/scheduling';
import { PlacementBuilder } from '@platform/sharding/test-utils';
import {
  ServiceDatabases,
  ServiceDefinitionBuilder,
  ServicePostgresServer,
} from '../../../__tests__/utils/index.js';
import { UseCaseRunner } from '../../../use-case-runner.js';
import { HealthCheckName, HealthEndpoints } from '../../health/index.js';
import { ServiceHostModule } from '../service-host.module.js';
import {
  ProbeRequest,
  RuntimeProbeRecorded,
  RuntimeProbeRootModule,
  runtimeProbeContract,
} from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('platform runtime over PostgreSQL', () => {
  const server = new ServicePostgresServer();
  const tenantA = '0193f1c2-0000-7000-8000-0000000000a1';
  const tenantB = '0193f1c2-0000-7000-8000-0000000000b2';
  let app: INestApplicationContext | undefined;

  beforeAll(async () => {
    await server.start();
  });

  afterAll(async () => {
    await app?.close();
    await server.stop();
  });

  it('migrates the shards, relays the outbox and reports ready', async () => {
    const databases = await server.provision();
    const [shardA, shardB] = databases.shards;
    const definition = ServiceDefinitionBuilder.aDefinition('runtime-probe')
      .with({
        contract: runtimeProbeContract,
        rootModule: RuntimeProbeRootModule,
      })
      .build();
    const context = await NestFactory.createApplicationContext(
      ServiceHostModule.forService(definition, {
        env: databases.environment(runtimeProbeContract.service),
        adapters: { valkey: false, aws: false },
        publisher: RecordingEnvelopePublisher,
        schedulingMode: SchedulingMode.External,
      }),
      { logger: false },
    );
    app = context;

    await context.get(ShardedMigrationRunner).migrateCatalog();
    const directory = context.get(TypeOrmDirectoryStore);
    await directory.setInstance(shardA.database, ServiceDatabases.INSTANCE);
    await directory.setInstance(shardB.database, ServiceDatabases.INSTANCE);
    await directory.putPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(tenantA)
        .withShardGroup(shardA.database)
        .build(),
      undefined,
    );
    await directory.putPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(tenantB)
        .withShardGroup(shardB.database)
        .build(),
      undefined,
    );
    await context.get(ShardedMigrationRunner).migrateAll();

    const requests = context.get(RequestContextStore);
    const transactions = context.get(TransactionManager);
    const bus = context.get(MessageBus);
    await requests.run(ProbeRequest.contextFor(tenantA), () =>
      transactions.runInTransaction(() =>
        bus.publish(RuntimeProbeRecorded, { probeId: tenantA }),
      ),
    );
    await requests.run(ProbeRequest.contextFor(tenantB), () =>
      transactions.runInTransaction(() =>
        bus.publish(RuntimeProbeRecorded, { probeId: tenantB }),
      ),
    );
    await context.get(JobRunner).runNow(MessagingJob.OutboxRelay);

    const published = context.get(RecordingEnvelopePublisher).published;
    expect(published).toHaveLength(2);
    expect(published.map((entry) => entry.envelope.data)).toEqual(
      expect.arrayContaining([{ probeId: tenantA }, { probeId: tenantB }]),
    );
    expect(context.get(UseCaseRunner)).toBeInstanceOf(UseCaseRunner);

    const summary = await context.get(HealthEndpoints).ready();
    expect(summary).toMatchObject({
      state: HealthState.Up,
      checks: {
        [HealthCheckName.Catalog]: { state: HealthState.Up },
        [HealthCheckName.Shards]: { state: HealthState.Up },
      },
    });

    await context.close();
    app = undefined;
  });
});
