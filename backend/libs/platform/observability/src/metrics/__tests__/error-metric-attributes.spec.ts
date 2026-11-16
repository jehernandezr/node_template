import { ErrorMetricAttributes } from '../error-metric-attributes.js';
import { MetricAttribute } from '../metric-attribute.enum.js';
import { DependencyTimeoutError } from './utils/dependency-timeout.error.js';

const LONG_CODE = `PLATFORM.CACHE.${'X'.repeat(200 - 'PLATFORM.CACHE.'.length)}`;

describe('ErrorMetricAttributes.of', () => {
  it('uses the valid code and the name, never the message', () => {
    const attributes = ErrorMetricAttributes.of(
      new DependencyTimeoutError('user ana@example.com'),
    );

    expect(attributes).toEqual({
      [MetricAttribute.ErrorCode]: 'PLATFORM.CACHE.TIMEOUT',
      [MetricAttribute.ErrorName]: 'DependencyTimeoutError',
    });
    expect(JSON.stringify(attributes)).not.toContain('ana@');
  });

  it.each([
    ['a string', 'x', { [MetricAttribute.ErrorName]: 'string' }],
    ['a number', 7, { [MetricAttribute.ErrorName]: 'number' }],
    ['null', null, { [MetricAttribute.ErrorName]: 'object' }],
    ['undefined', undefined, { [MetricAttribute.ErrorName]: 'undefined' }],
  ])('handles %s as a non-object error', (_label, input, expected) => {
    expect(ErrorMetricAttributes.of(input)).toEqual(expected);
  });

  it('drops a code that does not follow the error code format', () => {
    const error = Object.assign(new TypeError('socket hang up'), {
      code: 'ECONNRESET',
    });

    expect(ErrorMetricAttributes.of(error)).toEqual({
      [MetricAttribute.ErrorName]: 'TypeError',
    });
  });

  it('falls back to Object when the error has no usable name', () => {
    const error = { name: '', message: 'no name' };

    expect(ErrorMetricAttributes.of(error)).toEqual({
      [MetricAttribute.ErrorName]: 'Object',
    });
  });

  it('falls back to Object when the name is not a string', () => {
    expect(ErrorMetricAttributes.of({ name: 42 })).toEqual({
      [MetricAttribute.ErrorName]: 'Object',
    });
  });

  it('cuts a valid code and a long name to 128 characters', () => {
    const error = Object.assign(new Error('x'), {
      code: LONG_CODE,
      name: 'N'.repeat(200),
    });

    expect(ErrorMetricAttributes.of(error)).toEqual({
      [MetricAttribute.ErrorCode]: LONG_CODE.slice(
        0,
        ErrorMetricAttributes.MAX_LABEL_LENGTH,
      ),
      [MetricAttribute.ErrorName]: 'N'.repeat(
        ErrorMetricAttributes.MAX_LABEL_LENGTH,
      ),
    });
  });
});
