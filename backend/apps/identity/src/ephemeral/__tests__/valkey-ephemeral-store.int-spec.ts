import { randomUUID } from 'node:crypto';
import { ValkeyKeyspace } from '@platform/adapters-valkey';
import {
  ValkeyExecutors,
  ValkeyTestServer,
} from '@platform/adapters-valkey/test-utils';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { runEphemeralStoreContract } from '../../__tests__/utils/index.js';
import { ValkeyEphemeralStore } from '../valkey-ephemeral-store.js';

jest.setTimeout(120_000);

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable(
  'ValkeyEphemeralStore against a real server',
  () => {
    const server = new ValkeyTestServer('identity');

    beforeAll(async () => {
      await server.start();
    });

    afterAll(async () => {
      await server.stop();
    });

    runEphemeralStoreContract('ValkeyEphemeralStore', async () => {
      const run = randomUUID();
      return {
        store: new ValkeyEphemeralStore(
          ValkeyExecutors.over(server.connect()),
          new ValkeyKeyspace('identity'),
        ),
        key: (name) => `${run}:${name}`,
      };
    });
  },
);
