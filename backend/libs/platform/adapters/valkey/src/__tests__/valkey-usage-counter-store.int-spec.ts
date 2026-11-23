import { ContainerRuntime } from '@platform/kernel/test-utils';
import { runUsageCounterStoreContract } from '@platform/metering/test-utils';
import { ValkeyUsageCounterStore } from '../metering/valkey-usage-counter-store.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyExecutors, ValkeyTestServer } from './utils/index.js';

const PREFIX = 'tasks';

new ContainerRuntime(process.env).describeIfAvailable(
  'usage counters over Valkey',
  () => {
    jest.setTimeout(120_000);
    const server = new ValkeyTestServer(PREFIX);

    beforeAll(async () => {
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    runUsageCounterStoreContract(
      'ValkeyUsageCounterStore',
      () =>
        new ValkeyUsageCounterStore(
          ValkeyExecutors.over(server.connect()),
          new ValkeyKeyspace(PREFIX),
        ),
    );
  },
);
