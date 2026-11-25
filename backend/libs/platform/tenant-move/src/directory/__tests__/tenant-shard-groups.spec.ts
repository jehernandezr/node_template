import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveTargets } from '../../targets/tenant-move-targets.js';
import { TenantShardGroups } from '../tenant-shard-groups.js';

const groups = new TenantShardGroups(
  'tasks',
  new TenantMoveTargets({
    'eu-0': { region: 'eu', shard: 'tasks_main_a' },
    'sa-0': { region: 'sa', shard: 'tasks_main_b' },
  }),
);

describe('TenantShardGroups', () => {
  it('names a declared shard by its group and any other by its name without the service prefix', () => {
    expect(
      groups.groupsOf('eu', ['tasks_main_a', 'tasks_shard_1', 'legacy_0']),
    ).toEqual(['eu-0', 'shard_1', 'legacy_0']);
  });

  it('does not take the group of a shard declared for another region', () => {
    expect(groups.groupsOf('eu', ['tasks_main_b'])).toEqual(['main_b']);
  });

  it('gives the shard of a declared group, or the prefixed group otherwise', () => {
    expect(groups.shardOf('eu', 'eu-0')).toBe('tasks_main_a');
    expect(groups.shardOf('eu', 'shard_1')).toBe('tasks_shard_1');
  });

  it('writes the prefix of a service with a hyphen as its databases do', () => {
    const stock = new TenantShardGroups(
      'stock-items',
      new TenantMoveTargets({}),
    );

    expect(stock.groupsOf('eu', ['stock_items_shard_1'])).toEqual(['shard_1']);
    expect(stock.shardOf('eu', 'shard_1')).toBe('stock_items_shard_1');
  });

  it('refuses a declared group of another region', () => {
    expect(() => groups.shardOf('eu', 'sa-0')).toThrow(
      expect.objectContaining({ code: TenantMoveErrorCode.UnknownTarget }),
    );
  });
});
