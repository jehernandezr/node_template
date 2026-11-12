import type { z } from 'zod';
import { ValidationRules } from '../constants/validation.constants.js';
import { PlatformErrorCode } from '../enums/platform-error-code.enum.js';
import type { FieldError } from '../types/problem-details.type.js';

type Issue = z.core.$ZodIssue;

const LENGTH_ORIGINS = new Set(['string', 'array', 'set', 'file']);

function valueAt(input: unknown, path: readonly PropertyKey[]): unknown {
  let current: unknown = input;
  for (const segment of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<PropertyKey, unknown>)[segment];
  }
  return current;
}

function fieldOf(path: readonly PropertyKey[]): string | undefined {
  return path.length === 0
    ? undefined
    : path.map(String).join(ValidationRules.fieldPathSeparator);
}

function codeOf(issue: Issue, input: unknown): PlatformErrorCode {
  switch (issue.code) {
    case 'invalid_type':
      return valueAt(input, issue.path) === undefined
        ? PlatformErrorCode.ValidationRequired
        : PlatformErrorCode.ValidationInvalidType;
    case 'too_small':
      return LENGTH_ORIGINS.has(issue.origin)
        ? PlatformErrorCode.ValidationTooShort
        : PlatformErrorCode.ValidationTooSmall;
    case 'too_big':
      return LENGTH_ORIGINS.has(issue.origin)
        ? PlatformErrorCode.ValidationTooLong
        : PlatformErrorCode.ValidationTooLarge;
    case 'invalid_format':
      return PlatformErrorCode.ValidationInvalidFormat;
    case 'invalid_value':
      return PlatformErrorCode.ValidationInvalidEnum;
    default:
      return PlatformErrorCode.ValidationInvalidInput;
  }
}

/**
 * Traduce los issues de zod a `FieldError` con los códigos de la plataforma.
 * El validador Dart generado produce los mismos códigos y rutas, así el cliente
 * muestra el mismo error que devolvería el servidor.
 */
export function fieldErrorsFromZod(
  issues: readonly Issue[],
  input: unknown,
): FieldError[] {
  const errors: FieldError[] = [];
  for (const issue of issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        errors.push({
          field: fieldOf([...issue.path, key]),
          code: PlatformErrorCode.ValidationUnknownField,
        });
      }
      continue;
    }
    const field = fieldOf(issue.path);
    const code = codeOf(issue, input);
    errors.push(field === undefined ? { code } : { field, code });
  }
  return errors;
}

/** Resultado de validar una entrada contra un esquema del contrato. */
export type ContractValidation<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: FieldError[] };

/** Valida `input` con `schema` y devuelve el valor o los `FieldError`. */
export function validateContract<S extends z.ZodType>(
  schema: S,
  input: unknown,
): ContractValidation<z.output<S>> {
  const result = schema.safeParse(input);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, errors: fieldErrorsFromZod(result.error.issues, input) };
}
