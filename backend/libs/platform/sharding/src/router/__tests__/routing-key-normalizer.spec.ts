import { TenantId } from '@platform/kernel';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { ShardKey } from '../../model/shard-key.enum.js';
import { TestTenants } from '../../__tests__/utils/index.js';
import { RoutingKeyNormalizer } from '../routing-key-normalizer.js';
import { AsyncCall } from './utils/async-call.js';

const MISSING_VALUES: [string, unknown][] = [
  ['an empty string', ''],
  ['a number', 42],
  ['undefined', undefined],
];

describe('RoutingKeyNormalizer', () => {
  describe('tenantId', () => {
    it('lowercases a valid tenant id', () => {
      const normalizer = new RoutingKeyNormalizer(
        TenantId.DEFAULT_PATTERN,
        256,
      );

      expect(normalizer.tenantId(TestTenants.One.toUpperCase())).toBe(
        TestTenants.One,
      );
    });

    it.each(MISSING_VALUES)(
      'rejects %s as a missing tenant id',
      async (_name, raw) => {
        const normalizer = new RoutingKeyNormalizer(
          TenantId.DEFAULT_PATTERN,
          256,
        );

        await expect(
          AsyncCall.run(() => normalizer.tenantId(raw)),
        ).rejects.toMatchObject({ code: ShardingErrorCode.KeyMissing });
      },
    );

    it('rejects an id that does not match the format', async () => {
      const normalizer = new RoutingKeyNormalizer(
        TenantId.DEFAULT_PATTERN,
        256,
      );

      await expect(
        AsyncCall.run(() => normalizer.tenantId('not-a-uuid')),
      ).rejects.toMatchObject({ code: ShardingErrorCode.InvalidTenantId });
    });

    it('rejects an id longer than TenantId.MAX_LENGTH even when the pattern accepts it', async () => {
      const normalizer = new RoutingKeyNormalizer(/^a+$/, 256);

      await expect(
        AsyncCall.run(() =>
          normalizer.tenantId('a'.repeat(TenantId.MAX_LENGTH + 1)),
        ),
      ).rejects.toMatchObject({ code: ShardingErrorCode.InvalidTenantId });
    });

    it('accepts an id of exactly TenantId.MAX_LENGTH characters', () => {
      const normalizer = new RoutingKeyNormalizer(/^a+$/, 256);
      const id = 'a'.repeat(TenantId.MAX_LENGTH);

      expect(normalizer.tenantId(id)).toBe(id);
    });
  });

  describe('routingKey', () => {
    it('lowercases a routing key', () => {
      const normalizer = new RoutingKeyNormalizer(
        TenantId.DEFAULT_PATTERN,
        256,
      );

      expect(normalizer.routingKey(ShardKey.User, 'User-ABC')).toBe('user-abc');
    });

    it.each(MISSING_VALUES)(
      'rejects %s as a missing key value',
      async (_name, raw) => {
        const normalizer = new RoutingKeyNormalizer(
          TenantId.DEFAULT_PATTERN,
          256,
        );

        await expect(
          AsyncCall.run(() => normalizer.routingKey(ShardKey.User, raw)),
        ).rejects.toMatchObject({ code: ShardingErrorCode.KeyMissing });
      },
    );

    it('rejects a key longer than maxKeyLength before lowercasing', async () => {
      const normalizer = new RoutingKeyNormalizer(TenantId.DEFAULT_PATTERN, 4);

      await expect(
        AsyncCall.run(() => normalizer.routingKey(ShardKey.User, 'abcde')),
      ).rejects.toMatchObject({ code: ShardingErrorCode.InvalidKey });
    });

    it('rejects a key that grows past maxKeyLength once lowercased', async () => {
      const normalizer = new RoutingKeyNormalizer(TenantId.DEFAULT_PATTERN, 4);

      await expect(
        AsyncCall.run(() => normalizer.routingKey(ShardKey.User, 'İİİ')),
      ).rejects.toMatchObject({ code: ShardingErrorCode.InvalidKey });
    });

    it('accepts a key of exactly maxKeyLength characters', () => {
      const normalizer = new RoutingKeyNormalizer(TenantId.DEFAULT_PATTERN, 1);

      expect(normalizer.routingKey(ShardKey.Custom, 'a')).toBe('a');
    });
  });

  describe('constructor', () => {
    it.each([[0], [1.5]])(
      'rejects maxKeyLength %p as InvalidConfiguration',
      async (maxKeyLength) => {
        await expect(
          AsyncCall.run(
            () =>
              new RoutingKeyNormalizer(TenantId.DEFAULT_PATTERN, maxKeyLength),
          ),
        ).rejects.toMatchObject({
          code: ShardingErrorCode.InvalidConfiguration,
          details: { option: 'maxKeyLength' },
        });
      },
    );

    it.each([[/x/g], [/x/y]])(
      'rejects the pattern %p because of its g or y flag',
      async (pattern) => {
        await expect(
          AsyncCall.run(() => new RoutingKeyNormalizer(pattern, 256)),
        ).rejects.toMatchObject({
          code: ShardingErrorCode.InvalidConfiguration,
          details: { option: 'tenantIdPattern' },
        });
      },
    );
  });
});
