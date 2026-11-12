import { ShardingError, ShardingErrorCode } from './errors.js';
import { LeastLoadedPlacementPolicy } from './placement-policy.js';
import { TenantStatus, type TenantPlacement } from './types.js';

function placement(
  overrides: Partial<TenantPlacement> &
    Pick<TenantPlacement, 'tenantId' | 'shardGroup'>,
): TenantPlacement {
  return {
    region: 'eu',
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
    ...overrides,
  };
}

const SHARDS = [
  { region: 'eu', shard: 'eu-1' },
  { region: 'eu', shard: 'eu-2' },
  { region: 'us', shard: 'us-1' },
];

describe('LeastLoadedPlacementPolicy', () => {
  const policy = new LeastLoadedPlacementPolicy();

  it('picks the shard with the fewest tenants in the region', () => {
    const current = [
      placement({ tenantId: 't1', shardGroup: ['eu-1'] }),
      placement({ tenantId: 't2', shardGroup: ['eu-1'] }),
    ];
    expect(
      policy.place(
        { tenantId: 't3', region: 'eu', dedicated: false },
        current,
        SHARDS,
      ),
    ).toEqual({
      tenantId: 't3',
      region: 'eu',
      shardGroup: ['eu-2'],
      status: TenantStatus.Active,
      version: 1,
      dedicated: false,
    });
  });

  it('ignores tenants placed in other regions', () => {
    const current = [
      placement({ tenantId: 't1', region: 'us', shardGroup: ['us-1'] }),
      placement({ tenantId: 't2', region: 'us', shardGroup: ['us-1'] }),
      placement({ tenantId: 't3', shardGroup: ['eu-1'] }),
    ];
    expect(
      policy.place(
        { tenantId: 't4', region: 'us', dedicated: false },
        current,
        SHARDS,
      ).shardGroup,
    ).toEqual(['us-1']);
  });

  it('breaks ties with the shard listed first', () => {
    expect(
      policy.place(
        { tenantId: 't1', region: 'eu', dedicated: false },
        [],
        SHARDS,
      ).shardGroup,
    ).toEqual(['eu-1']);
  });

  it('counts a multi-shard group toward each of its shards', () => {
    const current = [
      placement({ tenantId: 'big', shardGroup: ['eu-1', 'eu-2'] }),
    ];
    const available = [
      { region: 'eu', shard: 'eu-1' },
      { region: 'eu', shard: 'eu-2' },
      { region: 'eu', shard: 'eu-3' },
    ];
    expect(
      policy.place(
        { tenantId: 't1', region: 'eu', dedicated: false },
        current,
        available,
      ).shardGroup,
    ).toEqual(['eu-3']);
  });

  it('is idempotent: a tenant already placed gets its existing placement back', () => {
    const existing = placement({
      tenantId: 't1',
      shardGroup: ['eu-2'],
      version: 4,
    });
    const result = policy.place(
      { tenantId: 't1', region: 'eu', dedicated: false },
      [existing],
      SHARDS,
    );
    expect(result).toBe(existing);
  });

  it('gives a dedicated tenant a shard used by no tenant and marks it dedicated', () => {
    const current = [placement({ tenantId: 't1', shardGroup: ['eu-1'] })];
    expect(
      policy.place(
        { tenantId: 'vip', region: 'eu', dedicated: true },
        current,
        SHARDS,
      ),
    ).toMatchObject({
      shardGroup: ['eu-2'],
      dedicated: true,
    });
  });

  it('throws UnknownShard when a dedicated tenant has no free shard', () => {
    const current = [
      placement({ tenantId: 't1', shardGroup: ['eu-1'] }),
      placement({ tenantId: 't2', shardGroup: ['eu-2'] }),
    ];
    expect(() =>
      policy.place(
        { tenantId: 'vip', region: 'eu', dedicated: true },
        current,
        SHARDS,
      ),
    ).toThrow(
      expect.objectContaining({ code: ShardingErrorCode.UnknownShard }),
    );
  });

  it('excludes shards used by a dedicated tenant for everyone else', () => {
    // eu-1 hosts a dedicated tenant (1 tenant), eu-2 hosts two shared tenants.
    // Without the exclusion the least-loaded rule would pick eu-1.
    const current = [
      placement({ tenantId: 'vip', shardGroup: ['eu-1'], dedicated: true }),
      placement({ tenantId: 't1', shardGroup: ['eu-2'] }),
      placement({ tenantId: 't2', shardGroup: ['eu-2'] }),
    ];
    expect(
      policy.place(
        { tenantId: 't3', region: 'eu', dedicated: false },
        current,
        SHARDS.slice(0, 2),
      ).shardGroup,
    ).toEqual(['eu-2']);
  });

  it('throws UnknownShard when only dedicated shards exist for a shared tenant', () => {
    const current = [
      placement({ tenantId: 'vip', shardGroup: ['eu-1'], dedicated: true }),
    ];
    const available = [{ region: 'eu', shard: 'eu-1' }];
    const attempt = () =>
      policy.place(
        { tenantId: 't1', region: 'eu', dedicated: false },
        current,
        available,
      );
    expect(attempt).toThrow(ShardingError);
    expect(attempt).toThrow(
      expect.objectContaining({ code: ShardingErrorCode.UnknownShard }),
    );
  });

  it('throws UnknownShard when the region has no shards', () => {
    expect(() =>
      policy.place(
        { tenantId: 't1', region: 'ap', dedicated: false },
        [],
        SHARDS,
      ),
    ).toThrow(
      expect.objectContaining({ code: ShardingErrorCode.UnknownShard }),
    );
  });
});
