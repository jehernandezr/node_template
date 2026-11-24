import { ShardingErrorCode } from '@platform/sharding';
import { PersistenceErrorCode } from '../errors/persistence-error-code.enum.js';
import { TenantMaintenanceSession } from '../tenant-maintenance-session.js';

describe('TenantMaintenanceSession.requireEveryShard', () => {
  it('asks to repeat the maintenance when a shard did not run because of a tenant move', () => {
    expect(() =>
      TenantMaintenanceSession.requireEveryShard({
        results: [{ shard: 'shard_0', value: 1 }],
        failures: [
          {
            shard: 'shard_1',
            timedOut: false,
            code: ShardingErrorCode.TenantMigrating,
          },
        ],
        partial: true,
      }),
    ).toThrow(
      expect.objectContaining({
        code: ShardingErrorCode.TenantMigrating,
        details: { shard: 'shard_1' },
      }),
    );
  });

  it('lets the maintenance through when every shard ran or failed for another reason', () => {
    expect(() =>
      TenantMaintenanceSession.requireEveryShard({
        results: [{ shard: 'shard_0', value: 1 }],
        failures: [
          {
            shard: 'shard_1',
            timedOut: false,
            code: PersistenceErrorCode.QueryFailed,
          },
        ],
        partial: true,
      }),
    ).not.toThrow();
  });
});
