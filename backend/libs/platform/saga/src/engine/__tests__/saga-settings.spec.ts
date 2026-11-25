import { FixedRandomSource } from '@platform/kernel/test-utils';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaError } from '../../errors/saga-error.js';
import { SagaSettings } from '../saga-settings.js';

describe('SagaSettings', () => {
  it('uses the default values when none are given', () => {
    const settings = new SagaSettings(
      { owner: 'node-a' },
      new FixedRandomSource(),
    );

    expect(settings.leaseMs).toBe(SagaSettings.DEFAULT_LEASE_MS);
    expect(settings.maxStepDurationMs).toBe(SagaSettings.DEFAULT_MAX_STEP_MS);
    expect(settings.maxSuspendAttempts).toBe(20);
    expect(settings.maxSuspendAgeMs).toBe(86_400_000);
    expect(settings.retentionMs).toBe(30 * 86_400_000);
    expect(settings.recoveryBatchSize).toBe(50);
  });

  it('rejects a lease that does not exceed the step time with InvalidConfiguration', () => {
    let error: unknown;
    try {
      new SagaSettings(
        { owner: 'node-a', leaseMs: 20_000, maxStepDurationMs: 25_000 },
        new FixedRandomSource(),
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(SagaError);
    expect((error as SagaError).code).toBe(SagaErrorCode.InvalidConfiguration);
  });

  it('waits with equal jitter taken from the injected random generator', () => {
    const settings = new SagaSettings(
      { owner: 'node-a' },
      new FixedRandomSource([0.5]),
    );
    const policy = settings.suspendPolicy();

    expect(policy.backoff(1)).toBe(750);
    expect(policy.backoff(2)).toBe(1500);
    expect(policy.backoff(10)).toBe(45_000);
  });
});
