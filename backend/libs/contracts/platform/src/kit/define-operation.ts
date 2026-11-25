import type { z } from 'zod';
import { Compensation } from '../enums/compensation.enum.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import { ERROR_CODE_PATTERN } from './error-catalog.js';

/** Retry policy of an idempotent operation. */
export interface OperationRetryPolicy {
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly maxMs: number;
}

interface OperationSpecBase<I extends z.ZodType, O extends z.ZodType> {
  /** Stable, versioned identifier, for example `identity.sessions.revoke-for-user.v1`. */
  readonly id: string;
  readonly input: I;
  readonly output: O;
  readonly idempotent: boolean;
  readonly errors?: readonly string[];
  readonly timeoutMs?: number;
  readonly retry?: OperationRetryPolicy;
  readonly description: string;
}

/** Operation that modifies data and declares which operation reverts it. */
interface CompensatedSpec {
  readonly mutating?: true;
  readonly compensatedBy: string;
  readonly compensationReason?: undefined;
}

/** Operation that modifies data without compensation: the reason is required. */
interface UncompensatedSpec {
  readonly mutating?: true;
  readonly compensatedBy: Compensation.None;
  readonly compensationReason: string;
}

/** Read-only operation. */
interface ReadOnlySpec {
  readonly mutating: false;
  readonly compensatedBy?: undefined;
  readonly compensationReason?: undefined;
}

export type OperationSpec<
  I extends z.ZodType,
  O extends z.ZodType,
> = OperationSpecBase<I, O> &
  (CompensatedSpec | UncompensatedSpec | ReadOnlySpec);

/**
 * Internal operation between services. `@platform/internal-api` registers it in the
 * router and calls it from the client exactly as declared here.
 */
export interface OperationDefinition<
  I extends z.ZodType = z.ZodType,
  O extends z.ZodType = z.ZodType,
> {
  /** `service.entity.operation.vN`. An incompatible change creates a `.vN+1` id. */
  readonly id: string;
  /** Version taken from the `.vN` suffix of the id. */
  readonly version: number;
  readonly input: I;
  readonly output: O;
  readonly idempotent: boolean;
  readonly mutating: boolean;
  readonly compensatedBy?: string;
  readonly compensationReason?: string;
  readonly errors: readonly string[];
  readonly timeoutMs?: number;
  readonly retry?: OperationRetryPolicy;
  readonly description: string;
}

/**
 * `service.entity.operation.vN`. The id is stored in the saga log and
 * in the idempotency keys, which is why the version is in the id from the start.
 */
const OPERATION_ID = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+\.v([1-9][0-9]*)$/;

/**
 * Declares an internal operation. An operation that modifies data declares
 * `compensatedBy`, or `Compensation.None` with a non-empty reason.
 */
export function defineOperation<I extends z.ZodType, O extends z.ZodType>(
  spec: OperationSpec<I, O>,
): OperationDefinition<I, O> {
  const fail = (reason: string): never => {
    throw new ContractDefinitionError(`Operation ${spec.id}: ${reason}`);
  };
  const match = OPERATION_ID.exec(spec.id);
  if (!match) fail('invalid id: expected service.entity.operation.vN');
  if (!spec.description.trim()) fail('missing description');
  const mutating = spec.mutating ?? true;
  if (mutating) {
    if (!spec.compensatedBy?.trim()) {
      fail('an operation that modifies data declares compensatedBy');
    }
    if (
      spec.compensatedBy === Compensation.None &&
      !spec.compensationReason?.trim()
    ) {
      fail('Compensation.None requires compensationReason');
    }
    if (spec.compensatedBy === spec.id) fail('it cannot compensate itself');
  } else if (spec.compensatedBy !== undefined) {
    fail('a read-only operation does not declare a compensation');
  }
  if (spec.timeoutMs !== undefined && !(spec.timeoutMs > 0)) {
    fail('timeoutMs must be positive');
  }
  const errors = [...(spec.errors ?? [])];
  for (const code of errors) {
    if (!ERROR_CODE_PATTERN.test(code)) fail(`invalid code ${code}`);
  }
  if (new Set(errors).size !== errors.length) fail('duplicate codes');

  const definition: {
    -readonly [K in keyof OperationDefinition<I, O>]: OperationDefinition<
      I,
      O
    >[K];
  } = {
    id: spec.id,
    version: Number(match?.[2]),
    input: spec.input,
    output: spec.output,
    idempotent: spec.idempotent,
    mutating,
    errors: Object.freeze(errors),
    description: spec.description,
  };
  if (spec.compensatedBy !== undefined) {
    definition.compensatedBy = spec.compensatedBy;
  }
  if (spec.compensationReason !== undefined) {
    definition.compensationReason = spec.compensationReason;
  }
  if (spec.timeoutMs !== undefined) definition.timeoutMs = spec.timeoutMs;
  if (spec.retry !== undefined) definition.retry = Object.freeze(spec.retry);
  return Object.freeze(definition);
}

/** Input type of an operation. */
export type OperationInput<O extends OperationDefinition> = z.input<O['input']>;

/** Output type of an operation. */
export type OperationOutput<O extends OperationDefinition> = z.output<
  O['output']
>;
