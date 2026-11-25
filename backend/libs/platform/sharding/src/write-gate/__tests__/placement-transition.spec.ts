import { DirectoryWriteResult } from '../../model/directory-write-result.enum.js';
import type { TenantPlacement } from '../../model/tenant-placement.js';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { ShardRouter } from '../../shard-router.js';
import {
  InMemoryDirectoryStore,
  PlacementBuilder,
  TestTenants,
} from '../../__tests__/utils/index.js';
import { PlacementTransition } from '../placement-transition.js';

/** Directory in which another writer wins the first conditional write. */
class RacingDirectoryStore extends InMemoryDirectoryStore {
  private raced = false;

  override async putPlacement(
    placement: TenantPlacement,
    expectedVersion: number | undefined,
  ): Promise<DirectoryWriteResult> {
    if (!this.raced) {
      this.raced = true;
      const stored = await this.readPlacement(placement.tenantId);
      if (stored !== undefined) {
        this.setPlacement({ ...stored, version: stored.version + 1 });
      }
    }
    return super.putPlacement(placement, expectedVersion);
  }
}

describe('PlacementTransition', () => {
  it('moves a tenant to another region and group with the next version', async () => {
    const directory = new InMemoryDirectoryStore();
    directory.setPlacement(PlacementBuilder.aPlacement().build());
    const transition = new PlacementTransition(
      directory,
      new ShardRouter({ directory }),
    );

    const placement = await transition.apply(TestTenants.One, () => ({
      region: 'sa',
      shardGroup: ['sa-1'],
    }));

    expect(placement).toMatchObject({
      region: 'sa',
      shardGroup: ['sa-1'],
      version: 2,
    });
    await expect(directory.readPlacement(TestTenants.One)).resolves.toEqual(
      placement,
    );
  });

  it('writes nothing when the placement already is as asked', async () => {
    const directory = new InMemoryDirectoryStore();
    directory.setPlacement(PlacementBuilder.aPlacement().build());
    const transition = new PlacementTransition(
      directory,
      new ShardRouter({ directory }),
    );

    const placement = await transition.apply(TestTenants.One, () => undefined);

    expect(placement.version).toBe(1);
  });

  it('reads again and applies the change over a write that won in between', async () => {
    const directory = new RacingDirectoryStore();
    directory.setPlacement(PlacementBuilder.aPlacement().build());
    const transition = new PlacementTransition(
      directory,
      new ShardRouter({ directory }),
    );

    const placement = await transition.apply(TestTenants.One, () => ({
      region: 'sa',
    }));

    expect(placement).toMatchObject({ region: 'sa', version: 3 });
  });

  it('refuses a tenant that the directory does not know', async () => {
    const directory = new InMemoryDirectoryStore();
    const transition = new PlacementTransition(
      directory,
      new ShardRouter({ directory }),
    );

    await expect(
      transition.apply(TestTenants.One, () => ({ region: 'sa' })),
    ).rejects.toMatchObject({ code: ShardingErrorCode.UnknownTenant });
  });

  it('refuses a group that takes the shard of a dedicated tenant', async () => {
    const directory = new InMemoryDirectoryStore();
    directory.setPlacement(PlacementBuilder.aPlacement().build());
    directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(TestTenants.Two)
        .withShardGroup('sa-1')
        .dedicated()
        .build(),
    );
    const transition = new PlacementTransition(
      directory,
      new ShardRouter({ directory }),
    );

    await expect(
      transition.apply(TestTenants.One, () => ({ shardGroup: ['sa-1'] })),
    ).rejects.toMatchObject({
      code: ShardingErrorCode.InvalidConfiguration,
      details: { result: DirectoryWriteResult.ShardTaken },
    });
  });
});
