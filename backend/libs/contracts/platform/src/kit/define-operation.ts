import type { z } from 'zod';
import { Compensation } from '../enums/compensation.enum.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import { ERROR_CODE_PATTERN } from './error-catalog.js';

/** Política de reintentos de una operación idempotente. */
export interface OperationRetryPolicy {
  readonly maxAttempts: number;
  readonly baseMs: number;
  readonly maxMs: number;
}

interface OperationSpecBase<I extends z.ZodType, O extends z.ZodType> {
  /** Identificador estable, por ejemplo `identity.sessions.revoke-for-user`. */
  readonly id: string;
  readonly input: I;
  readonly output: O;
  readonly idempotent: boolean;
  readonly errors?: readonly string[];
  readonly timeoutMs?: number;
  readonly retry?: OperationRetryPolicy;
  readonly description: string;
}

/** Operación que modifica datos y declara qué operación la revierte. */
interface CompensatedSpec {
  readonly mutating?: true;
  readonly compensatedBy: string;
  readonly compensationReason?: undefined;
}

/** Operación que modifica datos sin compensación: el motivo es obligatorio. */
interface UncompensatedSpec {
  readonly mutating?: true;
  readonly compensatedBy: Compensation.None;
  readonly compensationReason: string;
}

/** Operación de solo lectura. */
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
 * Operación interna entre servicios. Sus campos coinciden con `OperationOptions`
 * de `@platform/internal-api`, así se puede pasar tal cual a `@Operation`.
 */
export interface OperationDefinition<
  I extends z.ZodType = z.ZodType,
  O extends z.ZodType = z.ZodType,
> {
  readonly id: string;
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

const OPERATION_ID = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;

/**
 * Declara una operación interna. Una operación que modifica datos declara
 * `compensatedBy`, o `Compensation.None` con un motivo no vacío.
 */
export function defineOperation<I extends z.ZodType, O extends z.ZodType>(
  spec: OperationSpec<I, O>,
): OperationDefinition<I, O> {
  const fail = (reason: string): never => {
    throw new ContractDefinitionError(`Operación ${spec.id}: ${reason}`);
  };
  if (!OPERATION_ID.test(spec.id)) fail('id inválido');
  if (!spec.description.trim()) fail('falta la descripción');
  const mutating = spec.mutating ?? true;
  if (mutating) {
    if (!spec.compensatedBy?.trim()) {
      fail('una operación que modifica datos declara compensatedBy');
    }
    if (
      spec.compensatedBy === Compensation.None &&
      !spec.compensationReason?.trim()
    ) {
      fail('Compensation.None exige compensationReason');
    }
    if (spec.compensatedBy === spec.id) fail('no puede compensarse a sí misma');
  } else if (spec.compensatedBy !== undefined) {
    fail('una operación de solo lectura no declara compensación');
  }
  if (spec.timeoutMs !== undefined && !(spec.timeoutMs > 0)) {
    fail('timeoutMs debe ser positivo');
  }
  const errors = [...(spec.errors ?? [])];
  for (const code of errors) {
    if (!ERROR_CODE_PATTERN.test(code)) fail(`código inválido ${code}`);
  }
  if (new Set(errors).size !== errors.length) fail('códigos repetidos');

  const definition: {
    -readonly [K in keyof OperationDefinition<I, O>]: OperationDefinition<
      I,
      O
    >[K];
  } = {
    id: spec.id,
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

/** Tipo de la entrada de una operación. */
export type OperationInput<O extends OperationDefinition> = z.input<O['input']>;

/** Tipo de la salida de una operación. */
export type OperationOutput<O extends OperationDefinition> = z.output<
  O['output']
>;
