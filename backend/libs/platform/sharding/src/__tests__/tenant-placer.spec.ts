import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { LeastLoadedPlacementPolicy } from '../least-loaded-placement-policy.js';
import { DirectoryWriteResult } from '../model/directory-write-result.enum.js';
import type { TenantPlacement } from '../model/tenant-placement.js';
import type { AvailableShard } from '../placement-policy.js';
import { DirectoryWriter } from '../ports/directory-writer.js';
import { TenantPlacer } from '../tenant-placer.js';
import { InMemoryDirectoryStore, TestTenants } from './utils/index.js';

const SHARDS: readonly AvailableShard[] = [
  { region: 'eu', shard: 'eu-1' },
  { region: 'eu', shard: 'eu-2' },
];

/** Directorio donde otro escritor gana siempre la escritura. */
class AlwaysTakenDirectory extends DirectoryWriter {
  async readPlacement(): Promise<TenantPlacement | undefined> {
    return undefined;
  }

  async listPlacements(): Promise<readonly TenantPlacement[]> {
    return [];
  }

  async putPlacement(): Promise<DirectoryWriteResult> {
    return DirectoryWriteResult.ShardTaken;
  }
}

describe('TenantPlacer', () => {
  const policy = new LeastLoadedPlacementPolicy();
  const request = { tenantId: TestTenants.One, region: 'eu', dedicated: true };

  describe('when the directory accepts the write', () => {
    it('writes the placement chosen by the policy', async () => {
      const directory = new InMemoryDirectoryStore();
      const placer = new TenantPlacer(policy, directory);

      const result = await placer.place(request, SHARDS);

      expect(result).toMatchObject({
        placed: true,
        placement: { shardGroup: ['eu-1'] },
      });
      await expect(
        directory.getPlacement(TestTenants.One),
      ).resolves.toMatchObject({ shardGroup: ['eu-1'] });
    });

    it('returns the existing placement on a retry', async () => {
      const placer = new TenantPlacer(policy, new InMemoryDirectoryStore());
      const first = await placer.place(request, SHARDS);

      const again = await placer.place(request, SHARDS);

      expect(again).toEqual(first);
    });
  });

  describe('when two dedicated tenants sign up at the same time', () => {
    it('never gives them the same empty shard', async () => {
      const placer = new TenantPlacer(policy, new InMemoryDirectoryStore());

      const results = await Promise.all([
        placer.place(request, SHARDS),
        placer.place({ ...request, tenantId: TestTenants.Two }, SHARDS),
      ]);

      expect(
        new Set(
          results.map((result) =>
            result.placed ? result.placement.shardGroup[0] : undefined,
          ),
        ),
      ).toEqual(new Set(['eu-1', 'eu-2']));
    });
  });

  describe('when concurrent writers keep winning', () => {
    it('gives up with the last conflict after maxAttempts', async () => {
      const placer = new TenantPlacer(policy, new AlwaysTakenDirectory(), 2);

      await expect(placer.place(request, SHARDS)).resolves.toEqual({
        placed: false,
        conflict: DirectoryWriteResult.ShardTaken,
      });
    });
  });

  describe('when maxAttempts is not a positive integer', () => {
    it('rejects the configuration', () => {
      expect(
        () => new TenantPlacer(policy, new InMemoryDirectoryStore(), 0),
      ).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
        }),
      );
    });
  });
});
