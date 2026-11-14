import { ShardingErrorCode } from './errors.js';
import { RangeShardStrategy } from './range-shard-strategy.js';
import { routingKeyFor, validateShardingFeature } from './sharding-feature.js';
import {
  ShardKey,
  ShardStrategy,
  type ShardKeyResolver,
  type ShardingFeatureOptions,
} from './types.js';

interface Invoice {
  readonly accountId?: string;
}

const byAccount: ShardKeyResolver<Invoice> = {
  resolve: (invoice) => invoice.accountId,
};

const context = { tenantId: 't1', userId: 'u1' };

describe('validateShardingFeature', () => {
  it('accepts the declarations of the plan', () => {
    const identity = {
      strategy: ShardStrategy.Directory,
      key: ShardKey.User,
    } as const;
    expect(validateShardingFeature(identity)).toBe(identity);
    expect(() =>
      validateShardingFeature({
        strategy: ShardStrategy.ConsistentHash,
        key: ShardKey.Custom,
        keyResolver: byAccount,
      }),
    ).not.toThrow();
  });

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
  ])('rejects %p', (options) => {
    expect(() =>
      validateShardingFeature(options as ShardingFeatureOptions<Invoice>),
    ).toThrow(
      expect.objectContaining({ code: ShardingErrorCode.InvalidConfiguration }),
    );
  });

  it('names the built-in strategies', () => {
    expect(new RangeShardStrategy([], 'shard-1').kind).toBe(
      ShardStrategy.Range,
    );
  });
});

describe('routingKeyFor', () => {
  it('uses the tenant, the user of the context or the resolver', () => {
    expect(
      routingKeyFor(
        { strategy: ShardStrategy.Directory, key: ShardKey.Tenant },
        context,
      ),
    ).toEqual({ keyKind: ShardKey.Tenant });
    expect(
      routingKeyFor(
        { strategy: ShardStrategy.Directory, key: ShardKey.User },
        context,
      ),
    ).toEqual({ keyKind: ShardKey.User, keyValue: 'u1' });
    expect(
      routingKeyFor(
        {
          strategy: ShardStrategy.Directory,
          key: ShardKey.Custom,
          keyResolver: byAccount,
        },
        context,
        { accountId: 'acc-9' },
      ),
    ).toEqual({ keyKind: ShardKey.Custom, keyValue: 'acc-9' });
  });

  it('throws KeyMissing when the declared key is not available', () => {
    const missing = expect.objectContaining({
      code: ShardingErrorCode.KeyMissing,
    });
    expect(() =>
      routingKeyFor(
        { strategy: ShardStrategy.Directory, key: ShardKey.User },
        { tenantId: 't1' },
      ),
    ).toThrow(missing);
    expect(() =>
      routingKeyFor(
        {
          strategy: ShardStrategy.Directory,
          key: ShardKey.Custom,
          keyResolver: byAccount,
        },
        context,
        {},
      ),
    ).toThrow(missing);
  });
});
