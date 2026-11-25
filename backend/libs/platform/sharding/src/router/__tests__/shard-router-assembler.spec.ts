import { SystemClock } from '@platform/kernel';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import {
  InMemoryDirectoryStore,
  TestTenants,
} from '../../__tests__/utils/index.js';
import { ConsistentHashStrategy } from '../../sharding-strategy.js';
import { ShardRouterAssembler } from '../shard-router-assembler.js';
import type { ShardRouterOptions } from '../shard-router-options.js';
import { AsyncCall } from './utils/async-call.js';

describe('ShardRouterAssembler', () => {
  const directory = new InMemoryDirectoryStore();

  describe('assemble', () => {
    it('builds every part from a directory alone', () => {
      const parts = ShardRouterAssembler.assemble({
        clock: new SystemClock(),
        directory,
      });

      expect(parts).toMatchObject({
        clock: expect.anything(),
        strategy: expect.anything(),
        normalizer: expect.anything(),
        cache: expect.anything(),
        loader: expect.anything(),
        instances: expect.anything(),
        invalidator: expect.anything(),
        applier: expect.anything(),
      });
    });

    it.each<[string, Partial<ShardRouterOptions>]>([
      ['localTtlMs', { localTtlMs: -1 }],
      ['sharedTtlMs', { sharedTtlMs: Number.NaN }],
      ['tombstoneTtlMs', { tombstoneTtlMs: 0 }],
      ['maxPlacements', { maxPlacements: 0 }],
      ['maxInstances', { maxInstances: 0 }],
      ['maxKeyLength', { maxKeyLength: 0 }],
      ['tenantIdPattern', { tenantIdPattern: /x/g }],
      ['tenantIdPattern', { tenantIdPattern: /x/y }],
    ])(
      'rejects an invalid %s with InvalidConfiguration naming the option',
      async (option, overrides) => {
        await expect(
          AsyncCall.run(() =>
            ShardRouterAssembler.assemble({
              clock: new SystemClock(),
              directory,
              ...overrides,
            }),
          ),
        ).rejects.toMatchObject({
          code: ShardingErrorCode.InvalidConfiguration,
          details: { option },
        });
      },
    );

    it('accepts the default tenant pattern for TestTenants.One and rejects a short id', async () => {
      const { normalizer } = ShardRouterAssembler.assemble({
        clock: new SystemClock(),
        directory,
      });

      expect(normalizer.tenantId(TestTenants.One)).toBe(TestTenants.One);
      await expect(
        AsyncCall.run(() => normalizer.tenantId('tenant-1')),
      ).rejects.toMatchObject({ code: ShardingErrorCode.InvalidTenantId });
    });

    it('passes currentRegion and strategy through to the parts', () => {
      const strategy = new ConsistentHashStrategy();

      const parts = ShardRouterAssembler.assemble({
        clock: new SystemClock(),
        directory,
        currentRegion: 'eu',
        strategy,
      });

      expect(parts.currentRegion).toBe('eu');
      expect(parts.strategy).toBe(strategy);
    });
  });
});
