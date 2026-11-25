import {
  DirectoryWriteResult,
  ShardRouter,
  TenantStatus,
} from '@platform/sharding';
import {
  InMemoryDirectoryStore,
  PlacementBuilder,
} from '@platform/sharding/test-utils';
import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveTargets } from '../../targets/tenant-move-targets.js';
import { TenantDirectoryEntries } from '../tenant-directory-entries.js';
import { TenantShardGroups } from '../tenant-shard-groups.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05';
const NEIGHBOUR = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a06';

/** Un directorio donde otra escritura gana siempre entre la lectura y la escritura. */
class ContendedDirectoryStore extends InMemoryDirectoryStore {
  override async putPlacement(): Promise<DirectoryWriteResult> {
    return DirectoryWriteResult.VersionConflict;
  }

  override async deletePlacement(): Promise<DirectoryWriteResult> {
    return DirectoryWriteResult.VersionConflict;
  }
}

const entriesOver = (directory: InMemoryDirectoryStore) =>
  new TenantDirectoryEntries(
    directory,
    directory,
    new ShardRouter({ directory }),
    new TenantShardGroups(
      'tasks',
      new TenantMoveTargets({
        'group-1': { region: 'eu', shard: 'tasks_shard_1' },
      }),
    ),
  );

const directoryWithShards = (
  directory = new InMemoryDirectoryStore(),
): InMemoryDirectoryStore => {
  directory.setInstance('tasks_shard_0', 'main');
  directory.setInstance('tasks_shard_1', 'main');
  return directory;
};

const entry = {
  tenantId: TENANT,
  region: 'eu',
  groups: ['group-1'],
  dedicated: false,
};

describe('TenantDirectoryEntries', () => {
  it('places the tenant in the shard of its group and leaves a later placement alone when asked again', async () => {
    const directory = directoryWithShards();
    const entries = entriesOver(directory);

    await expect(entries.place(entry)).resolves.toEqual({ tenantId: TENANT });
    const placed = await directory.getPlacement(TENANT);
    directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(TENANT)
        .withShardGroup('tasks_shard_0')
        .withVersion(2)
        .build(),
    );
    await entries.place(entry);

    expect(placed).toEqual({
      tenantId: TENANT,
      region: 'eu',
      shardGroup: ['tasks_shard_1'],
      status: TenantStatus.Active,
      version: 1,
      dedicated: false,
    });
    await expect(directory.getPlacement(TENANT)).resolves.toMatchObject({
      shardGroup: ['tasks_shard_0'],
      version: 2,
    });
  });

  it('spreads a tenant over every shard of its groups once', async () => {
    const directory = directoryWithShards();

    await entriesOver(directory).place({
      ...entry,
      groups: ['shard_0', 'group-1', 'shard_1'],
    });

    await expect(directory.getPlacement(TENANT)).resolves.toMatchObject({
      shardGroup: ['tasks_shard_0', 'tasks_shard_1'],
    });
  });

  it('refuses a group whose shard is not in the directory of the service', async () => {
    const directory = directoryWithShards();

    await expect(
      entriesOver(directory).place({ ...entry, groups: ['shard_7'] }),
    ).rejects.toMatchObject({ code: TenantMoveErrorCode.UnknownTarget });
    await expect(directory.getPlacement(TENANT)).resolves.toBeUndefined();
  });

  it('refuses a dedicated tenant on a shard another tenant uses', async () => {
    const directory = directoryWithShards();
    directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(NEIGHBOUR)
        .withShardGroup('tasks_shard_1')
        .build(),
    );

    await expect(
      entriesOver(directory).place({ ...entry, dedicated: true }),
    ).rejects.toMatchObject({ code: TenantMoveErrorCode.ShardTaken });
  });

  it('removes the row of the tenant and answers the same when it is already gone', async () => {
    const directory = directoryWithShards();
    const entries = entriesOver(directory);
    await entries.place(entry);

    await expect(entries.remove({ tenantId: TENANT })).resolves.toEqual({
      tenantId: TENANT,
    });
    await expect(entries.remove({ tenantId: TENANT })).resolves.toEqual({
      tenantId: TENANT,
    });
    await expect(directory.getPlacement(TENANT)).resolves.toBeUndefined();
  });

  it('gives up when other writes keep winning', async () => {
    const directory = directoryWithShards(new ContendedDirectoryStore());
    directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(NEIGHBOUR)
        .withShardGroup('tasks_shard_0')
        .build(),
    );
    const entries = entriesOver(directory);

    await expect(entries.place(entry)).rejects.toThrow(
      'Other writes kept changing the tenant placement',
    );
    await expect(entries.remove({ tenantId: NEIGHBOUR })).rejects.toThrow(
      'Other writes kept changing the tenant placement',
    );
  });
});
