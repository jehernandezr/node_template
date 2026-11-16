import { FixedClock } from '@platform/kernel/test-utils';
import { ResilienceEventKind } from '../resilience-event-kind.enum.js';
import type { ResilienceEvent } from '../resilience-event.js';
import { ResilienceMetricAttribute } from '../resilience-metric-attribute.enum.js';
import { ResilienceMetricName } from '../resilience-metric-name.enum.js';
import { ResilienceMetricsListener } from '../resilience-metrics-listener.js';
import { ResilienceEventBus } from '../resilience-event-bus.js';
import {
  RecordingMetricsPort,
  TestPolicies,
} from '../../__tests__/utils/index.js';

function event(overrides: Partial<ResilienceEvent> = {}): ResilienceEvent {
  return {
    policy: 'cache',
    dependencyKey: 'valkey',
    kind: ResilienceEventKind.Retry,
    at: 0,
    ...overrides,
  };
}

describe('ResilienceMetricsListener', () => {
  it('counts an event with its policy, dependency and kind', () => {
    const metrics = new RecordingMetricsPort();
    new ResilienceMetricsListener(metrics).handle(event());
    expect(metrics.increments).toEqual([
      {
        name: ResilienceMetricName.Events,
        attributes: {
          [ResilienceMetricAttribute.Policy]: 'cache',
          [ResilienceMetricAttribute.Dependency]: 'valkey',
          [ResilienceMetricAttribute.Kind]: ResilienceEventKind.Retry,
        },
        value: undefined,
      },
    ]);
    expect(metrics.records).toEqual([]);
  });

  it('adds the error code, or the error name when there is no code', () => {
    const metrics = new RecordingMetricsPort();
    const listener = new ResilienceMetricsListener(metrics);
    listener.handle(
      event({ detail: { errorCode: 'PLATFORM.DB.DOWN', errorName: 'Error' } }),
    );
    listener.handle(event({ detail: { errorName: 'TypeError' } }));
    expect(
      metrics.increments.map(
        (entry) => entry.attributes?.[ResilienceMetricAttribute.ErrorCode],
      ),
    ).toEqual(['PLATFORM.DB.DOWN', 'TypeError']);
  });

  it('records the retry delay in the histogram', () => {
    const metrics = new RecordingMetricsPort();
    new ResilienceMetricsListener(metrics).handle(
      event({ detail: { delayMs: 75, attempt: 1 } }),
    );
    expect(metrics.records).toEqual([
      {
        name: ResilienceMetricName.RetryDelay,
        value: 75,
        attributes: {
          [ResilienceMetricAttribute.Policy]: 'cache',
          [ResilienceMetricAttribute.Dependency]: 'valkey',
        },
      },
    ]);
  });

  it('attaches to a registry and counts the events it publishes', async () => {
    const metrics = new RecordingMetricsPort();
    const registry = TestPolicies.registry({
      retry: { policy: TestPolicies.NO_WAIT },
    });
    new ResilienceMetricsListener(metrics).attach(registry);
    await expect(
      registry.execute(
        TestPolicies.API,
        async () =>
          Promise.reject(Object.assign(new Error('x'), { status: 503 })),
        { idempotent: true },
      ),
    ).rejects.toBeDefined();
    expect(
      metrics.increments.some(
        (entry) =>
          entry.attributes?.[ResilienceMetricAttribute.Kind] ===
          ResilienceEventKind.Retry,
      ),
    ).toBe(true);
  });

  it('attaches to any source that subscribes and returns the unsubscribe', () => {
    const metrics = new RecordingMetricsPort();
    const bus = new ResilienceEventBus(new FixedClock());
    const unsubscribe = new ResilienceMetricsListener(metrics).attach({
      subscribe: (listener) => bus.subscribe(listener),
    });
    bus.publish('cache', 'valkey', ResilienceEventKind.Reset);
    unsubscribe();
    bus.publish('cache', 'valkey', ResilienceEventKind.Reset);
    expect(metrics.increments).toHaveLength(1);
  });
});
