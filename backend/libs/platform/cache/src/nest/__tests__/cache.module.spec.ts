import { KernelModule } from '@platform/kernel/nest';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { CountingLoader } from '../../__tests__/utils/counting-loader.js';
import { FakeCachePort } from '../../__tests__/utils/fake-cache-port.js';
import { RecordingMetricsPort } from '../../__tests__/utils/recording-metrics-port.js';
import { CachePort } from '../../cache-port.js';
import { CacheAside } from '../../cache-aside.js';
import { InMemoryCache } from '../../in-memory-cache.js';
import { SingleFlight } from '../../single-flight.js';
import { CacheModule } from '../cache.module.js';
import { cacheAsideToken } from '../cache-tokens.js';
import { CacheTestModule } from './utils/cache-test.module.js';
import { EventLoop } from './utils/event-loop.js';
import { ResilienceTestModule } from './utils/resilience-test.module.js';

const TENANT_ORDERS = ['t1', 'orders'];

describe('CacheModule', () => {
  it('provides an InMemoryCache as CachePort by default', async () => {
    const ref = await Test.createTestingModule({
      imports: [KernelModule, CacheModule.forRoot()],
    }).compile();

    expect(ref.get(CachePort)).toBeInstanceOf(InMemoryCache);
  });

  it('provides the store given in forRoot as CachePort', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        KernelModule,
        CacheTestModule,
        CacheModule.forRoot({ store: FakeCachePort }),
      ],
    }).compile();

    expect(ref.get(CachePort)).toBe(ref.get(FakeCachePort));
  });

  it('gives a CacheAside per namespace that loads once and serves the next read from the cache', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        KernelModule,
        ResilienceTestModule,
        CacheModule.forRoot(),
        CacheModule.forFeature({ namespace: 'orders' }),
      ],
    }).compile();
    const aside = ref.get<CacheAside>(cacheAsideToken('orders'));
    const loader = new CountingLoader({ total: 3 });
    const read = (): Promise<{ total: number }> =>
      aside.getOrLoad({
        namespace: TENANT_ORDERS,
        params: { page: 1 },
        ttlMs: 5_000,
        load: loader.load,
      });

    await read();
    await EventLoop.drain();
    await read();
    expect(loader.calls).toBe(1);

    await aside.invalidate(TENANT_ORDERS);
    await read();
    expect(loader.calls).toBe(2);
  });

  it('keeps the keys of two namespaces apart for the same params', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        KernelModule,
        ResilienceTestModule,
        CacheModule.forRoot(),
        CacheModule.forFeature({ namespace: 'orders' }),
        CacheModule.forFeature({ namespace: 'invoices' }),
      ],
    }).compile();
    const orders = new CountingLoader('orders');
    const invoices = new CountingLoader('invoices');
    const params = { page: 1 };

    await ref.get<CacheAside>(cacheAsideToken('orders')).getOrLoad({
      namespace: TENANT_ORDERS,
      params,
      ttlMs: 5_000,
      load: orders.load,
    });
    await ref.get<CacheAside>(cacheAsideToken('invoices')).getOrLoad({
      namespace: TENANT_ORDERS,
      params,
      ttlMs: 5_000,
      load: invoices.load,
    });

    expect([orders.calls, invoices.calls]).toEqual([1, 1]);
  });

  it('counts absorbed cache failures per cache name when metrics are given', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        KernelModule,
        ResilienceTestModule,
        CacheTestModule,
        CacheModule.forRoot({
          store: FakeCachePort,
          metrics: RecordingMetricsPort,
        }),
        CacheModule.forFeature({ namespace: 'orders' }),
      ],
    }).compile();
    ref.get(FakeCachePort).fail(new Error('cache down'));
    const metrics = ref.get(RecordingMetricsPort);
    const aside = ref.get<CacheAside>(cacheAsideToken('orders'));

    await expect(
      aside.getOrLoad({
        namespace: TENANT_ORDERS,
        params: { page: 1 },
        ttlMs: 5_000,
        load: async () => 'value',
      }),
    ).resolves.toBe('value');

    expect(metrics.increments[0]).toMatchObject({
      name: 'platform.cache.errors',
      attributes: { cache: 'orders' },
    });
  });

  it('accepts an async configuration and applies the single flight key limit', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        KernelModule,
        CacheModule.forRootAsync({
          useFactory: () => ({ singleFlightMaxKeyLength: 2_048 }),
        }),
      ],
    }).compile();
    const flight = ref.get(SingleFlight);

    expect(flight).toBeInstanceOf(SingleFlight);
    await expect(
      flight.run('k'.repeat(2_049), async () => 'never'),
    ).rejects.toMatchObject({ code: 'PLATFORM.CACHE.KEY_TOO_LONG' });
  });
});
