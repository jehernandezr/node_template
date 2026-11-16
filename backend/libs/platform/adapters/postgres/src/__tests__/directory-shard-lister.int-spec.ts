import { ContainerRuntime, FixedClock } from '@platform/kernel/test-utils';
import { DirectoryShardLister } from '../directory/directory-shard-lister.js';
import { TypeOrmDirectoryStore } from '../stores/typeorm-directory-store.js';
import { PlatformTestDatabase } from './utils/index.js';

jest.setTimeout(180_000);

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('DirectoryShardLister over PostgreSQL', () => {
  const database = new PlatformTestDatabase();

  beforeAll(async () => {
    await database.start();
  });

  afterAll(async () => {
    await database.stop();
  });

  beforeEach(async () => {
    await database.truncateAll();
  });

  it('lists the logical shards with their instance from the catalog', async () => {
    const store = new TypeOrmDirectoryStore(
      database.catalogManagers,
      new FixedClock(),
    );
    await store.setInstance('shard-b', 'inst-2');
    await store.setInstance('shard-a', 'inst-1');

    await expect(new DirectoryShardLister(store).list()).resolves.toEqual([
      { logicalShard: 'shard-a', instance: 'inst-1' },
      { logicalShard: 'shard-b', instance: 'inst-2' },
    ]);
  });
});
