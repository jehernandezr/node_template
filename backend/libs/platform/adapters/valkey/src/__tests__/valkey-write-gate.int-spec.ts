import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  TestTenants,
  runTenantWriteGateContract,
} from '@platform/sharding/test-utils';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyWriteGate } from '../valkey-write-gate.js';
import { ValkeyExecutors, ValkeyTestServer } from './utils/index.js';

const PREFIX = 'tasks';

new ContainerRuntime(process.env).describeIfAvailable(
  'tenant write gate over Valkey',
  () => {
    jest.setTimeout(120_000);
    const server = new ValkeyTestServer(PREFIX);

    beforeAll(async () => {
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    const gateOver = (prefix: string) =>
      new ValkeyWriteGate(
        ValkeyExecutors.over(server.connect()),
        new ValkeyKeyspace(prefix),
      );

    runTenantWriteGateContract('ValkeyWriteGate', {
      async create() {
        const gate = gateOver(PREFIX);
        await gate.open(TestTenants.One);
        await gate.open(TestTenants.Two);
        return gate;
      },
    });
  },
);
