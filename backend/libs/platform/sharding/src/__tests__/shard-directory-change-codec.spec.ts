import { ShardDirectoryChangeKind } from '../model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from '../model/shard-directory-changed.js';
import { ShardingEvent } from '../model/sharding-event.enum.js';
import { ShardDirectoryChangeCodec } from '../shard-directory-change-codec.js';
import { TestTenants } from './utils/index.js';

const placementChange: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.TenantPlacement,
  tenantId: TestTenants.One,
  version: 4,
};

const unversionedChange: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.TenantPlacement,
  tenantId: TestTenants.One,
};

const instanceChange: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.ShardInstance,
  logicalShard: 'shard-1',
};

describe('ShardDirectoryChangeCodec', () => {
  describe('when a change is encoded and decoded', () => {
    it.each([
      ['a placement change with version', placementChange],
      ['a placement change without version', unversionedChange],
      ['an instance change', instanceChange],
    ])('round-trips %s', (_description, event) => {
      expect(
        ShardDirectoryChangeCodec.decode(
          ShardDirectoryChangeCodec.encode(event),
        ),
      ).toEqual(event);
    });
  });

  describe('when a message is malformed', () => {
    it.each([
      ['broken JSON', 'not json'],
      ['a bare number', '5'],
      ['an array', '[]'],
      ['null', 'null'],
      [
        'an unknown type',
        JSON.stringify({ ...placementChange, type: 'other.v1' }),
      ],
      [
        'an unknown kind',
        JSON.stringify({ ...placementChange, kind: 'other' }),
      ],
      [
        'an empty tenantId',
        JSON.stringify({ ...placementChange, tenantId: '' }),
      ],
      [
        'a tenantId of 257 characters',
        JSON.stringify({ ...placementChange, tenantId: 'x'.repeat(257) }),
      ],
      [
        'an empty logicalShard',
        JSON.stringify({ ...instanceChange, logicalShard: '' }),
      ],
      [
        'a negative version',
        JSON.stringify({ ...placementChange, version: -1 }),
      ],
      [
        'a fractional version',
        JSON.stringify({ ...placementChange, version: 1.5 }),
      ],
      [
        'a version sent as text',
        JSON.stringify({ ...placementChange, version: '3' }),
      ],
    ])('ignores %s', (_description, raw) => {
      expect(ShardDirectoryChangeCodec.decode(raw)).toBeUndefined();
    });
  });
});
