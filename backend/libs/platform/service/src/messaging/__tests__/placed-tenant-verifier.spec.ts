import {
  ShardRouter,
  ShardingError,
  ShardingErrorCode,
  TenantStatus,
} from '@platform/sharding';
import {
  InMemoryDirectoryStore,
  PlacementBuilder,
  TestTenants,
} from '@platform/sharding/test-utils';
import { PlacedTenantVerifier } from '../placed-tenant-verifier.js';

/** Directory that fails as a down database would. */
class UnavailableDirectoryStore extends InMemoryDirectoryStore {
  override getPlacement(): Promise<never> {
    return Promise.reject(
      new ShardingError(ShardingErrorCode.TenantMigrating, 'moving'),
    );
  }
}

class VerifierHarness {
  static readonly SHARD = 'shard_a';

  static placedIn(
    region: string,
    currentRegion = region,
  ): PlacedTenantVerifier {
    const directory = new InMemoryDirectoryStore();
    directory.setPlacement(
      PlacementBuilder.aPlacement()
        .withTenantId(TestTenants.One)
        .withRegion(region)
        .withShardGroup(VerifierHarness.SHARD)
        .withStatus(TenantStatus.Active)
        .build(),
    );
    directory.setInstance(VerifierHarness.SHARD, 'instance');
    return new PlacedTenantVerifier(
      new ShardRouter({ directory, currentRegion }),
    );
  }
}

describe('PlacedTenantVerifier', () => {
  describe('when the directory places the tenant', () => {
    it('accepts the envelope', async () => {
      await expect(
        VerifierHarness.placedIn('eu').verify(TestTenants.One),
      ).resolves.toBe(true);
    });
  });

  describe('when the envelope cannot run on any shard of this region', () => {
    it.each([
      ['without a tenant', undefined, 'eu'],
      ['with an unknown tenant', TestTenants.Two, 'eu'],
      ['with a malformed tenant', 'no-es-un-uuid', 'eu'],
      ['with a tenant of another region', TestTenants.One, 'us'],
    ])('rejects it %s', async (_case, tenantId, currentRegion) => {
      await expect(
        VerifierHarness.placedIn('eu', currentRegion).verify(tenantId),
      ).resolves.toBe(false);
    });
  });

  describe('when the directory fails', () => {
    it('lets the error out so the delivery is retried', async () => {
      const verifier = new PlacedTenantVerifier(
        new ShardRouter({ directory: new UnavailableDirectoryStore() }),
      );

      await expect(verifier.verify(TestTenants.One)).rejects.toMatchObject({
        code: ShardingErrorCode.TenantMigrating,
      });
    });
  });
});
