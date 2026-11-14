import {
  Compensation,
  PlatformErrorCode,
  type OperationDefinition,
} from '@contracts/platform';
import type { z } from 'zod';
import { InternalApiError } from './errors.js';

export { Compensation };

/** Retry policy for idempotent operations. */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly maxMs: number;
}

/** Normalized metadata of an operation, taken from its `defineOperation` descriptor. */
export interface OperationMetadata {
  readonly id: string;
  /** Id of the operation that reverts this one, or `Compensation.None`. */
  readonly compensatedBy?: string | Compensation;
  /** Required and non-empty when `compensatedBy` is `Compensation.None`. */
  readonly compensationReason?: string;
  readonly mutating: boolean;
  readonly idempotent: boolean;
  /** Business error codes the operation may return. */
  readonly errors: readonly string[];
  readonly retry?: RetryPolicy;
  readonly timeoutMs?: number;
}

/**
 * Business error code allowed on every operation without being declared. The
 * client and the router answer an input that breaks the contract with it, as a
 * `business-error` carrying `details.fieldErrors`.
 */
export const INVALID_INPUT_CODE = PlatformErrorCode.ValidationInvalidInput;

export const DEFAULT_RETRY_POLICY: RetryPolicy = Object.freeze({
  maxAttempts: 3,
  baseMs: 100,
  maxMs: 2000,
});
export const DEFAULT_TIMEOUT_MS = 5000;

/** Retry policy with defaults applied. */
export function effectiveRetry(metadata: OperationMetadata): RetryPolicy {
  return { ...DEFAULT_RETRY_POLICY, ...metadata.retry };
}

/** Per-attempt timeout with the default applied. */
export function effectiveTimeout(metadata: OperationMetadata): number {
  return metadata.timeoutMs ?? DEFAULT_TIMEOUT_MS;
}

/** Number of attempts the client may make. Non-idempotent operations get exactly one. */
export function effectiveAttempts(metadata: OperationMetadata): number {
  return metadata.idempotent
    ? Math.max(1, effectiveRetry(metadata).maxAttempts)
    : 1;
}

/**
 * Default time budget of a whole call: every attempt plus the longest backoff
 * between them. Used when the caller passes no `Deadline`.
 */
export function defaultCallBudgetMs(metadata: OperationMetadata): number {
  const attempts = effectiveAttempts(metadata);
  return (
    attempts * effectiveTimeout(metadata) +
    (attempts - 1) * effectiveRetry(metadata).maxMs
  );
}

/**
 * Id of the operation that reverts this one, or `null` when it has none: a
 * read-only operation, or one declared with `Compensation.None`.
 */
export function compensationOf(metadata: OperationMetadata): string | null {
  const { compensatedBy, mutating } = metadata;
  if (!mutating || compensatedBy === undefined) {
    return null;
  }
  return compensatedBy === Compensation.None ? null : compensatedBy;
}

/** Business error codes a handler or transport may return for this operation. */
export function allowedErrorCodes(
  metadata: OperationMetadata,
): ReadonlySet<string> {
  return new Set([...metadata.errors, INVALID_INPUT_CODE]);
}

/** Input and output schemas of an operation. */
export interface OperationSchemas {
  readonly input: z.ZodType;
  readonly output: z.ZodType;
}

/** Operation resolved from its `defineOperation` descriptor. */
export interface OperationDescriptor extends OperationSchemas {
  readonly id: string;
  readonly metadata: OperationMetadata;
}

/** What a caller passes as input (before parsing). */
export type CallInputOf<S extends OperationDefinition> = z.input<S['input']>;

/** What a handler receives (the parsed input). */
export type HandlerInputOf<S extends OperationDefinition> = z.output<
  S['input']
>;

/** Output of an operation, as returned by a handler and by the client. */
export type OperationOutputOf<S extends OperationDefinition> = z.output<
  S['output']
>;

/** Whether `value` looks like a `defineOperation` descriptor. */
export function isOperationDefinition(
  value: unknown,
): value is OperationDefinition {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<OperationDefinition>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.idempotent === 'boolean' &&
    typeof candidate.input?.safeParse === 'function' &&
    typeof candidate.output?.safeParse === 'function'
  );
}

const resolved = new WeakMap<object, OperationDescriptor>();

function fromDefinition(definition: OperationDefinition): OperationDescriptor {
  if (
    definition.compensatedBy === Compensation.None &&
    !definition.compensationReason?.trim()
  ) {
    throw new InternalApiError(
      PlatformErrorCode.InternalApiMissingCompensation,
      `Operation "${definition.id}" uses Compensation.None without a reason`,
    );
  }
  const metadata: OperationMetadata = Object.freeze({
    id: definition.id,
    idempotent: definition.idempotent,
    mutating: definition.mutating,
    errors: Object.freeze([...definition.errors]),
    ...(definition.compensatedBy !== undefined && {
      compensatedBy: definition.compensatedBy,
    }),
    ...(definition.compensationReason !== undefined && {
      compensationReason: definition.compensationReason,
    }),
    ...(definition.retry !== undefined && { retry: definition.retry }),
    ...(definition.timeoutMs !== undefined && {
      timeoutMs: definition.timeoutMs,
    }),
  });
  return Object.freeze({
    id: definition.id,
    input: definition.input,
    output: definition.output,
    metadata,
  });
}

/**
 * Resolves an operation from its `defineOperation` descriptor. The result is
 * cached per descriptor. Throws `InvalidOperation` for anything else, which
 * only an untyped caller can pass.
 */
export function resolveOperation(
  definition: OperationDefinition,
): OperationDescriptor {
  const cached = resolved.get(definition);
  if (cached !== undefined) {
    return cached;
  }
  if (!isOperationDefinition(definition)) {
    throw new InternalApiError(
      PlatformErrorCode.InternalApiInvalidOperation,
      'Expected a defineOperation descriptor',
    );
  }
  const descriptor = fromDefinition(definition);
  resolved.set(definition, descriptor);
  return descriptor;
}
