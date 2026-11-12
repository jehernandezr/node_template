import { Compensation, type OperationDefinition } from '@contracts/platform';
import type { z } from 'zod';
import { InternalApiError, InternalApiErrorCode } from './errors.js';

export { Compensation };

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

/** Normalized metadata of an operation. */
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

function assertCompensationReason(options: OperationOptions): void {
  if (
    options.compensatedBy === Compensation.None &&
    !options.compensationReason?.trim()
  ) {
    throw new InternalApiError(
      InternalApiErrorCode.MissingCompensation,
      `Operation "${options.id}" uses Compensation.None without a reason`,
    );
  }
}

function normalizeMetadata(options: OperationOptions): OperationMetadata {
  return Object.freeze({
    ...options,
    mutating: options.mutating ?? true,
    errors: Object.freeze([...(options.errors ?? [])]),
  });
}

/**
 * Class decorator that stores the operation metadata on the contract class.
 * Throws `MissingCompensation` when `Compensation.None` has no reason.
 * @deprecated Declare operations with `defineOperation` from `@contracts/platform`
 * and pass the descriptor to the registry, the client and the router.
 */
export function Operation(options: OperationOptions): ClassDecorator {
  assertCompensationReason(options);
  const metadata = normalizeMetadata(options);
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

/** Business error codes a handler or transport may return for this operation. */
export function allowedErrorCodes(
  metadata: OperationMetadata,
): ReadonlySet<string> {
  return new Set([...metadata.errors, INVALID_INPUT_CODE]);
}

/**
 * Base class of every operation contract. Subclasses provide the zod schemas.
 * @deprecated Use `defineOperation` from `@contracts/platform`.
 */
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

/** Input and output schemas of an operation. */
export interface OperationSchemas {
  readonly input: z.ZodType;
  readonly output: z.ZodType;
}

/**
 * Anything accepted as an operation: a descriptor from `defineOperation`
 * (the contract source) or a legacy `@Operation` class.
 */
export type OperationSource = OperationDefinition | ContractConstructor;

/** Operation resolved from any `OperationSource`. */
export interface OperationDescriptor extends OperationSchemas {
  readonly id: string;
  readonly metadata: OperationMetadata;
}

/** What a caller passes as input (before parsing). */
export type CallInputOf<S> =
  S extends OperationDefinition<infer I, z.ZodType>
    ? z.input<I>
    : ContractInput<S>;

/** What a handler receives (the parsed input). */
export type HandlerInputOf<S> =
  S extends OperationDefinition<infer I, z.ZodType>
    ? z.output<I>
    : ContractInput<S>;

/** Output of an operation, as returned by a handler and by the client. */
export type OperationOutputOf<S> =
  S extends OperationDefinition<z.ZodType, infer O>
    ? z.output<O>
    : ContractOutput<S>;

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
  const options: OperationOptions = {
    id: definition.id,
    idempotent: definition.idempotent,
    mutating: definition.mutating,
    errors: definition.errors,
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
  };
  assertCompensationReason(options);
  return Object.freeze({
    id: definition.id,
    input: definition.input,
    output: definition.output,
    metadata: normalizeMetadata(options),
  });
}

function fromClass(ContractClass: ContractConstructor): OperationDescriptor {
  const metadata = getOperationMetadata(ContractClass);
  if (metadata === undefined) {
    throw new InternalApiError(
      InternalApiErrorCode.InvalidOperation,
      `${ContractClass.name} is not decorated with @Operation`,
    );
  }
  const contract = new ContractClass();
  return Object.freeze({
    id: metadata.id,
    input: contract.input,
    output: contract.output,
    metadata,
  });
}

/**
 * Resolves an operation from a `defineOperation` descriptor or an
 * `@Operation` class. The result is cached per source. Throws
 * `InvalidOperation` for anything else.
 */
export function resolveOperation(source: OperationSource): OperationDescriptor {
  const cached = resolved.get(source);
  if (cached !== undefined) {
    return cached;
  }
  let descriptor: OperationDescriptor;
  if (typeof source === 'function') {
    descriptor = fromClass(source);
  } else if (isOperationDefinition(source)) {
    descriptor = fromDefinition(source);
  } else {
    throw new InternalApiError(
      InternalApiErrorCode.InvalidOperation,
      'Expected a defineOperation descriptor or an @Operation class',
    );
  }
  resolved.set(source, descriptor);
  return descriptor;
}
