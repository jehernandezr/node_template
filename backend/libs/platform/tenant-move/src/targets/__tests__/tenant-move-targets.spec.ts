import { TenantMoveErrorCode } from '../../errors/tenant-move-error-code.enum.js';
import { TenantMoveTargets } from '../tenant-move-targets.js';

const targets = new TenantMoveTargets({
  'sa-group-1': { region: 'sa-east-1', shard: 'tasks_shard_b0' },
});
const move = {
  moveId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f12',
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05',
};

describe('TenantMoveTargets', () => {
  it('gives the shard of the service in the target group of the requested region', () => {
    expect(
      targets.of({
        ...move,
        targetGroup: 'sa-group-1',
        targetRegion: 'sa-east-1',
      }),
    ).toEqual({
      group: 'sa-group-1',
      region: 'sa-east-1',
      shard: 'tasks_shard_b0',
    });
    expect(targets.find('sa-group-1')?.shard).toBe('tasks_shard_b0');
    expect(targets.find('eu-group-1')).toBeUndefined();
  });

  it('names the group of a shard only in the region of the group', () => {
    expect(targets.groupOf('sa-east-1', 'tasks_shard_b0')).toBe('sa-group-1');
    expect(targets.groupOf('us-east-1', 'tasks_shard_b0')).toBeUndefined();
  });

  it.each([
    ['a group that is not configured', 'eu-group-1', 'sa-east-1'],
    ['a group of another region', 'sa-group-1', 'us-east-1'],
  ])('refuses %s', (_label, targetGroup, targetRegion) => {
    expect(() => targets.of({ ...move, targetGroup, targetRegion })).toThrow(
      expect.objectContaining({ code: TenantMoveErrorCode.UnknownTarget }),
    );
  });
});
