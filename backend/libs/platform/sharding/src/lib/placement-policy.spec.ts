import { ShardingError, ShardingErrorCode } from './errors.js';
import { InMemoryDirectoryStore } from './in-memory-directory-store.js';
import {
  LeastLoadedPlacementPolicy,
  placeTenant,
  type ShardPlacementPolicy,
} from './placement-policy.js';
import { DirectoryWriteResult, type DirectoryWriter } from './ports.js';
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

describe('placeTenant', () => {
  const policy: ShardPlacementPolicy = new LeastLoadedPlacementPolicy();
  const request = { tenantId: 't-new', region: 'eu', dedicated: true };

  it('writes the placement chosen by the policy', async () => {
    const directory = new InMemoryDirectoryStore();
    const result = await placeTenant({
      policy,
      directory,
      request,
      availableShards: SHARDS,
    });
    expect(result).toMatchObject({
      placed: true,
      placement: { shardGroup: ['eu-1'] },
    });
    await expect(directory.getPlacement('t-new')).resolves.toMatchObject({
      shardGroup: ['eu-1'],
    });
  });

  // Audit PLAT-13: two concurrent dedicated sign-ups could take the same empty shard.
  it('never gives one empty shard to two concurrent dedicated tenants', async () => {
    const directory = new InMemoryDirectoryStore();
    const [first, second] = await Promise.all([
      placeTenant({ policy, directory, request, availableShards: SHARDS }),
      placeTenant({
        policy,
        directory,
        request: { ...request, tenantId: 't-other' },
        availableShards: SHARDS,
      }),
    ]);
    const shards = [first, second].map((result) =>
      result.placed ? result.placement.shardGroup[0] : undefined,
    );
    expect(new Set(shards)).toEqual(new Set(['eu-1', 'eu-2']));
  });

  it('returns the existing placement on a retry', async () => {
    const directory = new InMemoryDirectoryStore();
    const first = await placeTenant({
      policy,
      directory,
      request,
      availableShards: SHARDS,
    });
    const again = await placeTenant({
      policy,
      directory,
      request,
      availableShards: SHARDS,
    });
    expect(again).toEqual(first);
  });

  it('gives up with the last conflict after maxAttempts', async () => {
    const directory: DirectoryWriter = {
      listPlacements: async () => [],
      putPlacement: async () => DirectoryWriteResult.ShardTaken,
    };
    await expect(
      placeTenant({
        policy,
        directory,
        request,
        availableShards: SHARDS,
        maxAttempts: 2,
      }),
    ).resolves.toEqual({
      placed: false,
      conflict: DirectoryWriteResult.ShardTaken,
    });
  });

  it('rejects an invalid maxAttempts', async () => {
    await expect(
      placeTenant({
        policy,
        directory: new InMemoryDirectoryStore(),
        request,
        availableShards: SHARDS,
        maxAttempts: 0,
      }),
    ).rejects.toBeInstanceOf(ShardingError);
  });
});
