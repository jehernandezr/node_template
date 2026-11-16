import { PlatformErrorCode } from '@contracts/platform';
import { TenantStatus } from '@platform/sharding';
import { ShardDirectoryEntity } from '../entities/shard-directory.entity.js';
import { PlacementMapper } from '../stores/placement.mapper.js';

function aRow(
  overrides: Partial<Record<keyof ShardDirectoryEntity, unknown>> = {},
): ShardDirectoryEntity {
  return Object.assign(new ShardDirectoryEntity(), {
    tenantId: '0193f1c2-0000-7000-8000-0000000000a1',
    region: 'eu-west-1',
    shardGroup: ['shard-1'],
    status: TenantStatus.Active,
    version: 3,
    dedicated: false,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('PlacementMapper', () => {
  describe('when the row is well formed', () => {
    it('maps it to a placement with a copy of the shard group', () => {
      const entity = aRow({ shardGroup: ['shard-1', 'shard-2'] });

      const placement = PlacementMapper.toPlacement(entity);

      expect(placement).toEqual({
        tenantId: '0193f1c2-0000-7000-8000-0000000000a1',
        region: 'eu-west-1',
        shardGroup: ['shard-1', 'shard-2'],
        status: TenantStatus.Active,
        version: 3,
        dedicated: false,
      });
      expect(placement.shardGroup).not.toBe(entity.shardGroup);
    });
  });

  describe('when the row has an invalid shape', () => {
    it.each([
      ['an empty shard group', { shardGroup: [] }],
      ['a shard group that is not an array', { shardGroup: 'shard-1' }],
      ['an empty shard id', { shardGroup: [''] }],
      ['a status that is not a TenantStatus', { status: 'paused' }],
      ['a negative version', { version: -1 }],
      ['a version that is not an integer', { version: 1.5 }],
      ['a dedicated flag that is not a boolean', { dedicated: 'yes' }],
    ])('rejects %s with PersistenceCorruptRow', (_name, overrides) => {
      expect(() => PlacementMapper.toPlacement(aRow(overrides))).toThrow(
        expect.objectContaining({
          code: PlatformErrorCode.PersistenceCorruptRow,
        }),
      );
    });
  });
});
