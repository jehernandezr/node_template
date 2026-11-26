import { ErrorDescriptor } from '@platform/kernel';
import { MetricAttribute } from './metric-attribute.enum.js';
import type { MetricAttributes } from './metric-attributes.js';

/** Low-cardinality attributes for an error. Never uses the message, which may carry data. */
export class ErrorMetricAttributes {
  /** Maximum length of `error.code` and `error.name`. */
  static readonly MAX_LABEL_LENGTH = 128;

  /**
   * `error.code` if the error carries a valid code (`ErrorDescriptor.codeOf`) and
   * `error.name`. A value that is not an object gives only `error.name` with its `typeof`.
   * @param error Error to describe.
   * @returns The attributes.
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
