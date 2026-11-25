import { tenantMoveConfigSchema } from '../tenant-move.config.js';
import { TenantMoveStrategy } from '../tenant-move-strategy.enum.js';

describe('tenantMoveConfigSchema', () => {
  it('moves by batches with no targets and a week of grace when nothing is configured', () => {
    expect(tenantMoveConfigSchema.parse({})).toMatchObject({
      TENANT_MOVE_TARGETS: {},
      TENANT_MOVE_STRATEGY: TenantMoveStrategy.Batch,
      TENANT_MOVE_GRACE_DAYS: 7,
      TENANT_MOVE_DEADLINE_MS: 21_600_000,
    });
  });

  it('refuses a grace of zero days, which would lower the fence while a stale placement can still write', () => {
    expect(
      tenantMoveConfigSchema.safeParse({ TENANT_MOVE_GRACE_DAYS: '0' }).success,
    ).toBe(false);
  });

  it('reads the target groups from JSON', () => {
    const settings = tenantMoveConfigSchema.parse({
      TENANT_MOVE_TARGETS: JSON.stringify({
        'sa-group-1': { region: 'sa-east-1', shard: 'tasks_shard_b0' },
      }),
      TENANT_MOVE_STRATEGY: TenantMoveStrategy.LogicalReplication,
    });

    expect(settings.TENANT_MOVE_TARGETS).toEqual({
      'sa-group-1': { region: 'sa-east-1', shard: 'tasks_shard_b0' },
    });
  });

  it.each(['{', '{"sa-group-1": {"region": "sa-east-1"}}', '[]'])(
    'refuses the targets %s',
    (raw) => {
      expect(
        tenantMoveConfigSchema.safeParse({ TENANT_MOVE_TARGETS: raw }).success,
      ).toBe(false);
    },
  );
});
