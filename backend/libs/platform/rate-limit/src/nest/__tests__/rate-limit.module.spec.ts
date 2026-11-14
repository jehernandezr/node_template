import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { RateLimitMetricName } from '../../rate-limit-metric-name.enum.js';
import { InMemoryRateLimiter } from '../../in-memory-rate-limiter.js';
import { RateLimiter } from '../../rate-limiter.js';
import { RateLimitModule } from '../rate-limit.module.js';
import {
  FakeRateLimiter,
  RecordingMetricsPort,
} from '../../__tests__/utils/index.js';
import { RateLimitTestModule } from './utils/rate-limit-test.module.js';

const RULE = { name: 'module', limit: 4, windowMs: 60_000 };
const START = new Date('2025-01-01T00:00:00.000Z');

describe('RateLimitModule', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: START });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the in-memory limiter by default', async () => {
    const ref = await Test.createTestingModule({
      imports: [RateLimitModule.forRoot()],
    }).compile();
    expect(ref.get(RateLimiter)).toBeInstanceOf(InMemoryRateLimiter);
  });

  it('answers from the local limiter when the shared one fails and counts the degradation', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        RateLimitTestModule,
        RateLimitModule.forRoot({
          limiter: FakeRateLimiter,
          degradeLocally: true,
          metrics: RecordingMetricsPort,
        }),
      ],
    }).compile();
    const fake = ref.get(FakeRateLimiter);
    fake.failWith(new Error('valkey down'));
    const limiter = ref.get(RateLimiter);
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
      count: 1,
    });
    expect(ref.get(RecordingMetricsPort).increments).toContainEqual(
      expect.objectContaining({ name: RateLimitMetricName.Degraded }),
    );
  });

  it('uses the shared limiter as is without degradeLocally', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        RateLimitTestModule,
        RateLimitModule.forRoot({ limiter: FakeRateLimiter }),
      ],
    }).compile();
    expect(ref.get(RateLimiter)).toBe(ref.get(FakeRateLimiter));
  });

  it('applies forRootAsync options and the local divisor', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        RateLimitTestModule,
        RateLimitModule.forRootAsync({
          useFactory: () => ({ degradeLocally: true, localDivisor: 2 }),
          limiter: FakeRateLimiter,
        }),
      ],
    }).compile();
    ref.get(FakeRateLimiter).failWith(new Error('valkey down'));
    const limiter = ref.get(RateLimiter);
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
    });
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: true,
    });
    await expect(limiter.consume('k', RULE)).resolves.toMatchObject({
      allowed: false,
    });
  });
});
