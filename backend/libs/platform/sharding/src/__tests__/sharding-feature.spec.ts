import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { ShardKey } from '../model/shard-key.enum.js';
import { ShardStrategy } from '../model/shard-strategy.enum.js';
import type { ShardKeyResolver } from '../model/shard-key-resolver.js';
import type { ShardingFeatureOptions } from '../model/sharding-feature-options.js';
import { ShardingFeature } from '../sharding-feature.js';

interface Invoice {
  readonly accountId?: string;
}

const byAccount: ShardKeyResolver<Invoice> = {
  resolve: (invoice) => invoice.accountId,
};

const context = { tenantId: 't1', userId: 'u1' };

describe('ShardingFeature', () => {
  describe('when validating a declaration that is valid', () => {
    it('returns the same instance', () => {
      const feature = new ShardingFeature({
        strategy: ShardStrategy.Directory,
        key: ShardKey.User,
      });
      expect(feature.validate()).toBe(feature);
    });

    it('accepts a custom key with its resolver', () => {
      const feature = new ShardingFeature({
        strategy: ShardStrategy.ConsistentHash,
        key: ShardKey.Custom,
        keyResolver: byAccount,
      });
      expect(() => feature.validate()).not.toThrow();
    });
  });

  describe('when validating a declaration that is not valid', () => {
    it.each([
      [{ strategy: 'nope', key: ShardKey.Tenant }],
      [{ strategy: ShardStrategy.Range, key: 'nope' }],
      [{ strategy: ShardStrategy.Directory, key: ShardKey.Custom }],
      [
        {
          strategy: ShardStrategy.Directory,
          key: ShardKey.Tenant,
          keyResolver: byAccount,
        },
      ],
    ])('rejects %p with an invalid configuration', (options) => {
      const feature = new ShardingFeature(
        options as ShardingFeatureOptions<Invoice>,
      );
      expect(() => feature.validate()).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
        }),
      );
    });
  });

  describe('when the options are read', () => {
    it('keeps a frozen copy instead of the received object', () => {
      const options = {
        strategy: ShardStrategy.Directory,
        key: ShardKey.Tenant,
      };
      const feature = new ShardingFeature(options);
      expect(feature.options).not.toBe(options);
      expect(Object.isFrozen(feature.options)).toBe(true);
    });
  });

  describe('when computing the routing key', () => {
    it.each([
      [ShardKey.Tenant, undefined, { keyKind: ShardKey.Tenant }],
      [ShardKey.User, undefined, { keyKind: ShardKey.User, keyValue: 'u1' }],
    ])('for %s gives %p', (key, _source, expected) => {
      const feature = new ShardingFeature({
        strategy: ShardStrategy.Directory,
        key,
      });
      expect(feature.keyFor(context)).toEqual(expected);
    });

    it('uses the value the resolver reads from the source', () => {
      const feature = new ShardingFeature<Invoice>({
        strategy: ShardStrategy.Directory,
        key: ShardKey.Custom,
        keyResolver: byAccount,
      });
      expect(feature.keyFor(context, { accountId: 'acc-9' })).toEqual({
        keyKind: ShardKey.Custom,
        keyValue: 'acc-9',
      });
    });
  });

  describe('when the routing key is missing', () => {
    it.each([
      [
        'a user without userId',
        new ShardingFeature({
          strategy: ShardStrategy.Directory,
          key: ShardKey.User,
        }),
        { tenantId: 't1' },
        undefined,
      ],
      [
        'a custom key the resolver cannot read',
        new ShardingFeature<Invoice>({
          strategy: ShardStrategy.Directory,
          key: ShardKey.Custom,
          keyResolver: byAccount,
        }),
        context,
        {},
      ],
      [
        'a custom key without a source',
        new ShardingFeature<Invoice>({
          strategy: ShardStrategy.Directory,
          key: ShardKey.Custom,
          keyResolver: byAccount,
        }),
        context,
        undefined,
      ],
    ])('throws KeyMissing for %s', (_description, feature, ctx, source) => {
      expect(() => feature.keyFor(ctx, source)).toThrow(
        expect.objectContaining({ code: ShardingErrorCode.KeyMissing }),
      );
    });
  });
});
