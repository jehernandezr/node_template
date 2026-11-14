import { PlatformErrorCode } from '@contracts/platform';
import { BackoffStrategy, createBackoff } from '@platform/primitives';
import type { CompiledSaga } from '../definition/saga-flow.js';
import type { SagaDefinition } from '../definition/saga-definition.js';
import { SagaDefinitionIssueCode } from '../definition/saga-validation.js';
import { SagaError } from '../errors.js';
import type { SagaCallContext } from '../model.js';

export const DEFAULT_LEASE_MS = 30_000;
export const DEFAULT_MAX_STEP_MS = 25_000;
export const DEFAULT_MAX_SUSPEND_ATTEMPTS = 20;
export const DEFAULT_MAX_SUSPEND_AGE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BACKOFF_BASE_MS = 1_000;
const DEFAULT_BACKOFF_MAX_MS = 60_000;

/**
 * Exponential backoff with equal jitter. After an outage every saga suspended
 * at the same moment would otherwise retry at the same instants; the jitter
 * spreads them while keeping at least half of the exponential wait.
 */
export function defaultBackoff(
  random?: () => number,
): (attempt: number) => number {
  return createBackoff({
    strategy: BackoffStrategy.EqualJitter,
    baseMs: DEFAULT_BACKOFF_BASE_MS,
    maxMs: DEFAULT_BACKOFF_MAX_MS,
    ...(random !== undefined && { random }),
  });
}

/** Rejects a lease that does not outlive a step call: another node could take the saga mid-call. */
export function assertLeaseOutlivesStep(
  leaseMs: number,
  maxStepDurationMs: number,
): void {
  if (leaseMs <= maxStepDurationMs) {
    throw new SagaError(
      PlatformErrorCode.SagaInvalidConfiguration,
      `leaseMs (${leaseMs}) must be greater than maxStepDurationMs (${maxStepDurationMs})`,
    );
  }
}

/** Builds every saga once, checking that each is registered under its own type. */
export function compileAll(
  registry: ReadonlyMap<string, SagaDefinition<unknown>>,
): ReadonlyMap<string, CompiledSaga<unknown>> {
  const compiled = new Map<string, CompiledSaga<unknown>>();
  const mismatches: string[] = [];
  for (const [key, definition] of registry) {
    const saga = definition.build();
    if (saga.type !== key) {
      mismatches.push(
        `Saga "${saga.type}" is registered as "${key}"; the key must be its type`,
      );
    }
    compiled.set(key, saga);
  }
  if (mismatches.length > 0) {
    throw new SagaError(
      PlatformErrorCode.SagaInvalidDefinition,
      mismatches.join('\n'),
      { code: SagaDefinitionIssueCode.TypeMismatch },
    );
  }
  return compiled;
}

/** Keeps only the defined fields of a call context; null when none is set. */
export function callContext(
  context: SagaCallContext | undefined,
): SagaCallContext | null {
  if (context === undefined) {
    return null;
  }
  const { tenantId, actorId, traceparent } = context;
  const copy: SagaCallContext = {
    ...(tenantId !== undefined && { tenantId }),
    ...(actorId !== undefined && { actorId }),
    ...(traceparent !== undefined && { traceparent }),
  };
  return Object.keys(copy).length === 0 ? null : copy;
}
