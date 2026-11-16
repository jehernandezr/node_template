import { PlatformErrorCode } from '@contracts/platform';
import { SagaError } from '../../errors.js';
import { type SagaInstance, SagaStatus, StepDirection } from '../../model.js';
import {
  errorDetail,
  MAX_ERROR_DETAIL_LENGTH,
  requireIntervention,
  suspend,
  type SuspendPolicy,
} from '../transitions.js';

const NOW = new Date('2026-01-01T00:00:00Z');

function instance(overrides: Partial<SagaInstance> = {}): SagaInstance {
  return {
    id: 's1',
    type: 't',
    idempotencyKey: null,
    status: SagaStatus.Running,
    state: {},
    currentStep: 0,
    direction: StepDirection.Forward,
    version: 0,
    leaseToken: null,
    leaseUntil: null,
    nextAttemptAt: null,
    attempts: 0,
    suspendedSince: null,
    deadlineAt: null,
    lastErrorCode: null,
    lastErrorDetail: null,
    context: null,
    inputDigest: 'digest',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const policy: SuspendPolicy = {
  maxSuspendAttempts: 2,
  maxSuspendAgeMs: 60_000,
  backoff: (attempt) => attempt * 100,
};

describe('suspend', () => {
  it('schedules the next attempt with the backoff and keeps the detail', () => {
    const next = suspend(instance(), 'X.Y.Z', 'timeout', NOW, policy);

    expect(next.status).toBe(SagaStatus.Suspended);
    expect(next.attempts).toBe(1);
    expect(next.nextAttemptAt?.getTime()).toBe(NOW.getTime() + 100);
    expect(next.suspendedSince).toEqual(NOW);
    expect(next.lastErrorDetail).toBe('timeout');
  });

  it('requires intervention once the attempts are exhausted, keeping the suspension start', () => {
    const since = new Date(NOW.getTime() - 1_000);
    const next = suspend(
      instance({ attempts: 2, suspendedSince: since }),
      'X.Y.Z',
      null,
      NOW,
      policy,
    );

    expect(next.status).toBe(SagaStatus.RequiresIntervention);
    expect(next.nextAttemptAt).toBeNull();
    expect(next.suspendedSince).toEqual(since);
  });

  it('requires intervention when the suspension outlives its maximum age', () => {
    const since = new Date(NOW.getTime() - 60_000);
    const next = suspend(
      instance({ attempts: 1, suspendedSince: since }),
      'X.Y.Z',
      null,
      NOW,
      policy,
    );

    expect(next.status).toBe(SagaStatus.RequiresIntervention);
  });
});

describe('requireIntervention', () => {
  it('stops retries and records why', () => {
    const next = requireIntervention(
      instance({
        status: SagaStatus.Suspended,
        nextAttemptAt: NOW,
        suspendedSince: NOW,
      }),
      'X.Y.Z',
      'detail',
    );

    expect(next).toMatchObject({
      status: SagaStatus.RequiresIntervention,
      nextAttemptAt: null,
      suspendedSince: null,
      lastErrorCode: 'X.Y.Z',
      lastErrorDetail: 'detail',
    });
  });
});

describe('errorDetail', () => {
  it('uses the code and message of a platform error', () => {
    expect(
      errorDetail(new SagaError(PlatformErrorCode.SagaInvalidState, 'bad')),
    ).toBe(`${PlatformErrorCode.SagaInvalidState}: bad`);
  });

  it('uses the name and message of any other error', () => {
    expect(errorDetail(new TypeError('x is undefined'))).toBe(
      'TypeError: x is undefined',
    );
  });

  it('never copies a thrown value that is not an error', () => {
    expect(errorDetail({ password: 'secret' })).toBe('thrown object');
  });

  it('truncates long messages', () => {
    const detail = errorDetail(new Error('x'.repeat(1_000)));

    expect(detail).toHaveLength(MAX_ERROR_DETAIL_LENGTH);
    expect(detail.endsWith('…')).toBe(true);
  });
});
