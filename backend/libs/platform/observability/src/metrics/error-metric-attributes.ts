import { ErrorDescriptor } from '@platform/kernel';
import { MetricAttribute } from './metric-attribute.enum.js';
import type { MetricAttributes } from './metric-attributes.js';

/** Atributos de baja cardinalidad para un error. Nunca usa el mensaje, que puede llevar datos. */
export class ErrorMetricAttributes {
  /** Longitud máxima de `error.code` y `error.name`. */
  static readonly MAX_LABEL_LENGTH = 128;

  /**
   * `error.code` si el error trae un código válido (`ErrorDescriptor.codeOf`) y
   * `error.name`. Un valor que no es objeto da solo `error.name` con su `typeof`.
   */
  static of(error: unknown): MetricAttributes {
    if (typeof error !== 'object' || error === null) {
      return { [MetricAttribute.ErrorName]: typeof error };
    }
    const code = ErrorDescriptor.codeOf(error);
    const name = (error as { name?: unknown }).name;
    return {
      ...(code !== undefined && {
        [MetricAttribute.ErrorCode]: code.slice(
          0,
          ErrorMetricAttributes.MAX_LABEL_LENGTH,
        ),
      }),
      [MetricAttribute.ErrorName]:
        typeof name === 'string' && name.length > 0
          ? name.slice(0, ErrorMetricAttributes.MAX_LABEL_LENGTH)
          : 'Object',
    };
  }
}
