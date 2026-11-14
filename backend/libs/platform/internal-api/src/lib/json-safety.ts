import type { OperationSchemas } from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';

/** Zod schema types that cannot round-trip through JSON transport unchanged. */
const NON_JSON_TYPES: ReadonlySet<string> = new Set([
  'pipe',
  'transform',
  'date',
]);

function firstNonJsonType(
  values: unknown[],
  seen: Set<object>,
): string | undefined {
  for (const value of values) {
    const found = findNonJsonType(value, seen);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function findNonJsonType(
  value: unknown,
  seen: Set<object>,
): string | undefined {
  if (typeof value !== 'object' || value === null || seen.has(value)) {
    return undefined;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return firstNonJsonType(value, seen);
  }
  if (!('_zod' in value)) {
    return firstNonJsonType(Object.values(value), seen);
  }

  const def = (value as { _zod: { def: Record<string, unknown> } })._zod.def;
  const type = String(def['type']);
  if (NON_JSON_TYPES.has(type)) {
    return type;
  }
  if (type === 'lazy' && typeof def['getter'] === 'function') {
    return findNonJsonType((def['getter'] as () => unknown)(), seen);
  }
  return firstNonJsonType(
    Object.entries(def)
      .filter(([key]) => key !== 'checks' && key !== 'entries')
      .map(([, child]) => child),
    seen,
  );
}

/**
 * Throws `NonJsonSafeSchema` when the input or output schema uses transforms, pipes or `z.date()`.
 * Such schemas would validate differently on each side of the wire.
 */
export function assertJsonSafeContract(
  contract: OperationSchemas,
  label = 'contract',
): void {
  const sides: Array<[string, unknown]> = [
    ['input', contract.input],
    ['output', contract.output],
  ];
  for (const [side, schema] of sides) {
    const found = findNonJsonType(schema, new Set());
    if (found !== undefined) {
      throw new InternalApiError(
        InternalApiErrorCode.NonJsonSafeSchema,
        `${label} ${side} schema uses "${found}", which does not survive JSON transport`,
      );
    }
  }
}
