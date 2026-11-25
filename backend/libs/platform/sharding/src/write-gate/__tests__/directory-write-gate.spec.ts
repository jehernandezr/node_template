import { SystemClock } from '@platform/kernel';
import { InProcessDirectoryChannel } from '../../in-process-directory-channel.js';
import { ShardAccess } from '../../model/shard-access.enum.js';
import { ShardKey } from '../../model/shard-key.enum.js';
import { TenantStatus } from '../../model/tenant-status.enum.js';
import { ShardRouter } from '../../shard-router.js';
import {
  InMemoryDirectoryStore,
  PlacementBuilder,
  TestTenants,
  runTenantWriteGateContract,
} from '../../__tests__/utils/index.js';
import { DirectoryWriteGate } from '../directory-write-gate.js';
import { PlacementTransition } from '../placement-transition.js';

function directoryWithTwoTenants(): InMemoryDirectoryStore {
  const directory = new InMemoryDirectoryStore();
  directory.setInstance('shard-1', 'node-a');
  directory.setPlacement(PlacementBuilder.aPlacement().build());
  directory.setPlacement(
    PlacementBuilder.aPlacement().withTenantId(TestTenants.Two).build(),
  );
  return directory;
}

runTenantWriteGateContract('DirectoryWriteGate', {
  async create() {
    const directory = directoryWithTwoTenants();
    const router = new ShardRouter({ clock: new SystemClock(), directory });
    return new DirectoryWriteGate(
      router,
      new PlacementTransition(directory, router),
    );
  },
});

describe('DirectoryWriteGate', () => {
  it('marks the placement as migrating with a new version', async () => {
    const directory = directoryWithTwoTenants();
    const router = new ShardRouter({ clock: new SystemClock(), directory });
    const gate = new DirectoryWriteGate(
      router,
      new PlacementTransition(directory, router),
    );

    await gate.close(TestTenants.One);

    await expect(
      directory.readPlacement(TestTenants.One),
    ).resolves.toMatchObject({ status: TenantStatus.Migrating, version: 2 });
  });

  it('lets every process that listens to the directory see the gate closed at once', async () => {
    const directory = directoryWithTwoTenants();
    const channel = new InProcessDirectoryChannel();
    const writerRouter = new ShardRouter({
      clock: new SystemClock(),
      directory,
      changes: channel,
    });
    const otherRouter = new ShardRouter({
      clock: new SystemClock(),
      directory,
    });
    await otherRouter.listen(channel);
    await otherRouter.resolve({
      tenantId: TestTenants.One,
      keyKind: ShardKey.Tenant,
      access: ShardAccess.Write,
    });
    const gate = new DirectoryWriteGate(
      writerRouter,
      new PlacementTransition(directory, writerRouter),
    );
    const otherGate = new DirectoryWriteGate(
      otherRouter,
      new PlacementTransition(directory, otherRouter),
    );

    await gate.close(TestTenants.One);

    await expect(otherGate.isClosed(TestTenants.One)).resolves.toBe(true);
  });
});
