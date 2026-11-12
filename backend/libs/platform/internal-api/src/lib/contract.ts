import type { z } from 'zod';
import { InternalApiError, InternalApiErrorCode } from './errors.js';

/** Declares that an operation has no compensation. A non-empty reason is mandatory. */
export enum Compensation {
  None = 'none',
}

/** Retry policy for idempotent operations. */
export interface RetryPolicy {
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly maxMs: number;
}

/** Options accepted by the `@Operation` decorator. */
export interface OperationOptions {
  readonly id: string;
  /** Id of the operation that reverts this one, or `Compensation.None`. */
  readonly compensatedBy?: string | Compensation;
  /** Required and non-empty when `compensatedBy` is `Compensation.None`. */
  readonly compensationReason?: string;
  /** Defaults to `true`. */
  readonly mutating?: boolean;
  readonly idempotent: boolean;
  readonly errors?: readonly string[];
  readonly retry?: RetryPolicy;
  readonly timeoutMs?: number;
}

/** Normalized metadata stored by `@Operation`. */
export interface OperationMetadata extends OperationOptions {
  readonly mutating: boolean;
  readonly errors: readonly string[];
}

/** Symbol under which `@Operation` stores metadata on the contract class. */
export const OPERATION_METADATA = Symbol.for('platform.internal-api.operation');

/** Business error code allowed on every operation without being declared. */
export const INVALID_INPUT_CODE = 'PLATFORM.VALIDATION.INVALID_INPUT';

export const DEFAULT_RETRY_POLICY: RetryPolicy = Object.freeze({
  maxAttempts: 3,
  baseMs: 100,
  maxMs: 2000,
});
export const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Class decorator that stores the operation metadata on the contract class.
 * Throws `MissingCompensation` when `Compensation.None` has no reason.
 */
export function Operation(options: OperationOptions): ClassDecorator {
  if (
    options.compensatedBy === Compensation.None &&
    !options.compensationReason?.trim()
  ) {
    throw new InternalApiError(
      InternalApiErrorCode.MissingCompensation,
      `Operation "${options.id}" uses Compensation.None without a reason`,
    );
  }
  const metadata: OperationMetadata = Object.freeze({
    ...options,
    mutating: options.mutating ?? true,
    errors: Object.freeze([...(options.errors ?? [])]),
  });
  return (target) => {
    Object.defineProperty(target, OPERATION_METADATA, {
      value: metadata,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  };
}

/** Returns the `@Operation` metadata declared on this class itself (inherited metadata is ignored). */
export function getOperationMetadata(
  contract: object,
): OperationMetadata | undefined {
  if (!Object.prototype.hasOwnProperty.call(contract, OPERATION_METADATA)) {
    return undefined;
  }
  return Reflect.get(contract, OPERATION_METADATA) as OperationMetadata;
}

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

/** Business error codes a handler or transport may return for this operation. */
export function allowedErrorCodes(
  metadata: OperationMetadata,
): ReadonlySet<string> {
  return new Set([...metadata.errors, INVALID_INPUT_CODE]);
}

/** Base class of every operation contract. Subclasses provide the zod schemas. */
export abstract class OperationContract<TIn, TOut> {
  abstract readonly input: z.ZodType<TIn>;
  abstract readonly output: z.ZodType<TOut>;
}

/** Constructor of a concrete contract class. */
export type ContractConstructor = new () => OperationContract<unknown, unknown>;

/** Input type of a contract class. */
export type ContractInput<C> = C extends new () => OperationContract<
  infer I,
  unknown
>
  ? I
  : never;

/** Output type of a contract class. */
export type ContractOutput<C> = C extends new () => OperationContract<
  unknown,
  infer O
>
  ? O
  : never;
