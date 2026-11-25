import { SagaInstance } from '../../model/saga-instance.js';
import type { SagaInstanceProps } from '../../model/saga-instance-props.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { StepDirection } from '../../model/step-direction.enum.js';
import type { StepLogEntry } from '../../model/step-log-entry.js';
import { StepStatus } from '../../model/step-status.enum.js';
import { StepKey } from '../../model/step-key.js';

/** Builds test instances and log entries, with valid defaults. */
export class SagaInstanceBuilder {
  static readonly NOW = new Date('2026-01-01T00:00:00.000Z');
  static readonly DEFAULT_ID = '0193f1c2-0000-7000-8000-0000000000a1';

  private constructor(private props: SagaInstanceProps) {}

  static aSaga(): SagaInstanceBuilder {
    const now = SagaInstanceBuilder.NOW;
    return new SagaInstanceBuilder({
      id: SagaInstanceBuilder.DEFAULT_ID,
      type: 'tenant.onboarding',
      idempotencyKey: null,
      status: SagaStatus.Running,
      state: { name: 'acme' },
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
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Log entry of a step, forward and in `Dispatched` by default. */
  static aStep(
    sagaId: string,
    stepIndex: number,
    overrides: Partial<StepLogEntry> = {},
  ): StepLogEntry {
    const direction = overrides.direction ?? StepDirection.Forward;
    return {
      sagaId,
      stepIndex,
      operationId: `svc.step${stepIndex}.v1`,
      direction,
      status: StepStatus.Dispatched,
      idempotencyKey: StepKey.of(sagaId, stepIndex, direction),
      input: { step: stepIndex },
      output: undefined,
      errorCode: null,
      traceparent: null,
      startedAt: SagaInstanceBuilder.NOW,
      finishedAt: null,
      ...overrides,
    };
  }

  with(patch: Partial<SagaInstanceProps>): SagaInstanceBuilder {
    return new SagaInstanceBuilder({ ...this.props, ...patch });
  }

  build(): SagaInstance {
    return SagaInstance.rehydrate(this.props);
  }
}
