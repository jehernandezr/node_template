import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import type { OperationSchemas } from './operation-schemas.js';

/**
 * Comprueba que los esquemas de una operación sobreviven al transporte JSON.
 * Un esquema con transformaciones, pipes o `z.date()` validaría distinto en
 * cada lado del cable.
 */
export class JsonSafetyChecker {
  /** Tipos de esquema zod que no hacen ida y vuelta por JSON sin cambiar. */
  private static readonly NON_JSON_TYPES: ReadonlySet<string> = new Set([
    'pipe',
    'transform',
    'date',
  ]);

  /**
   * @throws InternalApiError `NonJsonSafeSchema` si el esquema de entrada o de salida no es seguro.
   */
  assertSafe(contract: OperationSchemas, label = 'contract'): void {
    const sides: Array<[string, unknown]> = [
      ['input', contract.input],
      ['output', contract.output],
    ];
    for (const [side, schema] of sides) {
      const found = this.findNonJsonType(schema, new Set());
      if (found !== undefined) {
        throw new InternalApiError(
          InternalApiErrorCode.NonJsonSafeSchema,
          `${label} ${side} schema uses "${found}", which does not survive JSON transport`,
        );
      }
    }
  }

  private firstNonJsonType(
    values: unknown[],
    seen: Set<object>,
  ): string | undefined {
    for (const value of values) {
      const found = this.findNonJsonType(value, seen);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }

  private findNonJsonType(
    value: unknown,
    seen: Set<object>,
  ): string | undefined {
    if (typeof value !== 'object' || value === null || seen.has(value)) {
      return undefined;
    }
    seen.add(value);

    if (Array.isArray(value)) {
      return this.firstNonJsonType(value, seen);
    }
    if (!('_zod' in value)) {
      return this.firstNonJsonType(Object.values(value), seen);
    }

    const def = (value as { _zod: { def: Record<string, unknown> } })._zod.def;
    const type = String(def['type']);
    if (JsonSafetyChecker.NON_JSON_TYPES.has(type)) {
      return type;
    }
    if (type === 'lazy' && typeof def['getter'] === 'function') {
      return this.findNonJsonType((def['getter'] as () => unknown)(), seen);
    }
    return this.firstNonJsonType(
      Object.entries(def)
        .filter(([key]) => key !== 'checks' && key !== 'entries')
        .map(([, child]) => child),
      seen,
    );
  }
}
