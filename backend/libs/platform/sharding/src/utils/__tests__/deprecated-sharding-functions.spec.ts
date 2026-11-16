import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { ShardDirectoryChangeKind } from '../../model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from '../../model/shard-directory-changed.js';
import { ShardKey } from '../../model/shard-key.enum.js';
import { ShardStrategy } from '../../model/shard-strategy.enum.js';
import { ShardingEvent } from '../../model/sharding-event.enum.js';
import {
  decodeShardDirectoryChanged,
  encodeShardDirectoryChanged,
  routingKeyFor,
  validateShardingFeature,
} from '../deprecated-sharding-functions.js';

const VALID_OPTIONS = {
  strategy: ShardStrategy.Directory,
  key: ShardKey.Tenant,
} as const;

const EVENT: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.TenantPlacement,
  tenantId: '01941f29-7c00-7000-8000-000000000001',
  version: 3,
};

describe('deprecated sharding functions', () => {
  describe('when validating options', () => {
    it('returns options equal to the valid ones', () => {
      expect(validateShardingFeature(VALID_OPTIONS)).toEqual(VALID_OPTIONS);
    });

    it('rejects an unknown strategy as invalid configuration', () => {
      expect(() =>
        validateShardingFeature({
          strategy: 'nope' as ShardStrategy,
          key: ShardKey.Tenant,
        }),
      ).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
        }),
      );
    });
  });

  describe('when computing a routing key', () => {
    it('returns the user key with the user id of the context', () => {
      expect(
        routingKeyFor(
          { strategy: ShardStrategy.Directory, key: ShardKey.User },
          { tenantId: 't1', userId: 'u1' },
        ),
      ).toEqual({ keyKind: ShardKey.User, keyValue: 'u1' });
    });
  });

  describe('when encoding and decoding a change', () => {
    it('decodes the encoded event back to the same event', () => {
      expect(
        decodeShardDirectoryChanged(encodeShardDirectoryChanged(EVENT)),
      ).toEqual(EVENT);
    });
  });
});
