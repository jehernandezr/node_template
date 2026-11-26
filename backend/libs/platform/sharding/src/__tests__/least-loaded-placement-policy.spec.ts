import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { LeastLoadedPlacementPolicy } from '../least-loaded-placement-policy.js';
import { TenantStatus } from '../model/tenant-status.enum.js';
import type { AvailableShard } from '../placement-policy.js';
import { PlacementBuilder, TestTenants } from './utils/index.js';

const EU_1 = 'eu-1';
const EU_2 = 'eu-2';
const EU_3 = 'eu-3';
const US_1 = 'us-1';
const SHARDS: readonly AvailableShard[] = [
  { region: 'eu', shard: EU_1 },
  { region: 'eu', shard: EU_2 },
  { region: 'us', shard: US_1 },
];
const NEW_TENANT = '01941f29-7c00-7000-8000-0000000000aa';

const placed = (tenantId: string, ...shardGroup: string[]): PlacementBuilder =>
  PlacementBuilder.aPlacement()
    .withTenantId(tenantId)
    .withShardGroup(...shardGroup);

describe('LeastLoadedPlacementPolicy', () => {
  const policy = new LeastLoadedPlacementPolicy();
  const shared = { tenantId: NEW_TENANT, region: 'eu', dedicated: false };
  const dedicated = { ...shared, dedicated: true };

  describe('when the tenant is shared', () => {
    it('picks the shard with the fewest tenants in the region', () => {
      const current = [
        placed(TestTenants.One, EU_1).build(),
        placed(TestTenants.Two, EU_1).build(),
      ];

      const placement = policy.place(shared, current, SHARDS);

      expect(placement).toEqual({
        tenantId: NEW_TENANT,
        region: 'eu',
        shardGroup: [EU_2],
        status: TenantStatus.Active,
        version: 1,
        dedicated: false,
      });
    });

    it('ignores tenants placed in other regions', () => {
      const current = [
        placed(TestTenants.One, US_1).withRegion('us').build(),
        placed(TestTenants.Two, US_1).withRegion('us').build(),
        placed(TestTenants.Three, EU_1).build(),
      ];

      const placement = policy.place(
        { ...shared, region: 'us' },
        current,
        SHARDS,
      );

      expect(placement.shardGroup).toEqual([US_1]);
    });

    it('breaks ties with the shard listed first', () => {
      expect(policy.place(shared, [], SHARDS).shardGroup).toEqual([EU_1]);
    });

    it('counts a multi-shard group toward each of its shards', () => {
      const current = [placed(TestTenants.One, EU_1, EU_2).build()];
      const available = [...SHARDS, { region: 'eu', shard: EU_3 }];

      expect(policy.place(shared, current, available).shardGroup).toEqual([
        EU_3,
      ]);
    });

    it('returns the existing placement of a tenant already placed', () => {
      const existing = placed(NEW_TENANT, EU_2).withVersion(4).build();

      expect(policy.place(shared, [existing], SHARDS)).toBe(existing);
    });

    it('skips a shard used by a dedicated tenant even if it is the least loaded', () => {
      const current = [
        placed(TestTenants.One, EU_1).dedicated().build(),
        placed(TestTenants.Two, EU_2).build(),
        placed(TestTenants.Three, EU_2).build(),
      ];

      const placement = policy.place(shared, current, SHARDS.slice(0, 2));

      expect(placement.shardGroup).toEqual([EU_2]);
    });

    it('throws UnknownShard when only dedicated shards exist', () => {
      const current = [placed(TestTenants.One, EU_1).dedicated().build()];

      expect(() =>
        policy.place(shared, current, [{ region: 'eu', shard: EU_1 }]),
      ).toThrow(
        expect.objectContaining({ code: ShardingErrorCode.UnknownShard }),
      );
    });

    it('throws UnknownShard when the region has no shards', () => {
      expect(() =>
        policy.place({ ...shared, region: 'ap' }, [], SHARDS),
      ).toThrow(
        expect.objectContaining({ code: ShardingErrorCode.UnknownShard }),
      );
    });
  });

  describe('when the tenant is dedicated', () => {
    it('gives it a shard used by no tenant and marks it dedicated', () => {
      const current = [placed(TestTenants.One, EU_1).build()];

      expect(policy.place(dedicated, current, SHARDS)).toMatchObject({
        shardGroup: [EU_2],
        dedicated: true,
      });
    });

    it('throws UnknownShard when there is no free shard', () => {
      const current = [
        placed(TestTenants.One, EU_1).build(),
        placed(TestTenants.Two, EU_2).build(),
      ];

      expect(() => policy.place(dedicated, current, SHARDS)).toThrow(
        expect.objectContaining({ code: ShardingErrorCode.UnknownShard }),
      );
    });
  });
});
