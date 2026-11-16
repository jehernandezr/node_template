import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { ResilienceErrorCode } from '../../errors/resilience-error-code.enum.js';
import { ResilienceEventKind } from '../../events/resilience-event-kind.enum.js';
import type { ResilienceEvent } from '../../events/resilience-event.js';
import { PolicyName } from '../../policy/policy-name.js';
import { ResilienceRegistry } from '../../resilience-registry.js';
import { ResilienceModule } from '../resilience.module.js';
import {
  FlakyOperation,
  RecordingMetricsPort,
} from '../../__tests__/utils/index.js';
import { RecordingMetricsModule } from './utils/recording-metrics.module.js';

const PAYMENTS = PolicyName.of('payments');
const PAYMENTS_POLICY = {
  timeoutMs: 1000,
  retry: { policy: new RetryPolicy(3, 0, 0, BackoffStrategy.None) },
};

@Injectable()
class PaymentsService {
  constructor(private readonly resilience: ResilienceRegistry) {}

  charge(operation: () => Promise<string>): Promise<string> {
    return this.resilience.execute(PAYMENTS, operation, { idempotent: true });
  }
}

describe('ResilienceModule', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('provides a registry that runs under the built-in cache policy', async () => {
    const ref = await Test.createTestingModule({
      imports: [ResilienceModule.forRoot()],
    }).compile();
    const registry = ref.get(ResilienceRegistry);
    await expect(
      registry.execute(PolicyName.Cache, async () => 'cached'),
    ).resolves.toBe('cached');
  });

  it('runs a service policy registered with forFeature and retries its transient failures', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        ResilienceModule.forRoot(),
        ResilienceModule.forFeature({
          name: PAYMENTS,
          policy: PAYMENTS_POLICY,
        }),
      ],
      providers: [PaymentsService],
    }).compile();
    const service = ref.get(PaymentsService);
    const flaky = new FlakyOperation(
      2,
      () => Object.assign(new Error('busy'), { status: 503 }),
      'charged',
    );
    const result = await service.charge(() => flaky.run());
    expect(result).toBe('charged');
    expect(flaky.calls).toBe(3);
  });

  it('applies a timeout override from forRootAsync to a policy that uses the default', async () => {
    jest.useFakeTimers();
    const ref = await Test.createTestingModule({
      imports: [
        ResilienceModule.forRootAsync({
          useFactory: () => ({ policies: { cache: { timeoutMs: 1234 } } }),
        }),
      ],
    }).compile();
    const registry = ref.get(ResilienceRegistry);
    const events: ResilienceEvent[] = [];
    registry.subscribe((event) => {
      events.push(event);
    });
    const outcome = registry
      .execute(PolicyName.Cache, () => new Promise<never>(() => undefined), {
        totalTimeoutMs: 5000,
      })
      .catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(1234);
    expect(await outcome).toMatchObject({ code: ResilienceErrorCode.Timeout });
    expect(
      events
        .filter((event) => event.kind === ResilienceEventKind.Timeout)
        .map((event) => event.detail?.timeoutMs),
    ).toEqual([1234]);
  });

  it('counts the retries in the metrics port when it is provided', async () => {
    const ref = await Test.createTestingModule({
      imports: [
        RecordingMetricsModule,
        ResilienceModule.forRoot({ metrics: RecordingMetricsPort }),
        ResilienceModule.forFeature({
          name: PAYMENTS,
          policy: PAYMENTS_POLICY,
        }),
      ],
      providers: [PaymentsService],
    }).compile();
    const service = ref.get(PaymentsService);
    const flaky = new FlakyOperation(
      1,
      () => Object.assign(new Error('busy'), { status: 503 }),
      'ok',
    );
    await service.charge(() => flaky.run());
    expect(ref.get(RecordingMetricsPort).increments).toContainEqual(
      expect.objectContaining({
        name: 'platform.resilience.events',
        attributes: expect.objectContaining({
          kind: ResilienceEventKind.Retry,
        }),
      }),
    );
  });

  it('fails to compile when a feature registers the same name with another configuration', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          ResilienceModule.forRoot(),
          ResilienceModule.forFeature({
            name: PAYMENTS,
            policy: PAYMENTS_POLICY,
          }),
          ResilienceModule.forFeature({
            name: PAYMENTS,
            policy: { timeoutMs: 2000 },
          }),
        ],
      }).compile(),
    ).rejects.toMatchObject({ code: ResilienceErrorCode.InvalidPolicy });
  });
});
