import { DomainError } from '../domain-error.js';
import { ErrorDescriptor } from '../error-descriptor.js';

class SampleError extends DomainError {
  override readonly code = 'PLATFORM.TEST.SAMPLE';
}

describe('ErrorDescriptor', () => {
  it('describes an error with a valid code', () => {
    expect(ErrorDescriptor.describe(new SampleError('boom'))).toEqual({
      name: 'SampleError',
      code: 'PLATFORM.TEST.SAMPLE',
      message: 'boom',
    });
  });

  it('omits the code when the error has none or it is malformed', () => {
    const malformed = Object.assign(new Error('x'), { code: 'ECONNRESET' });
    expect(ErrorDescriptor.describe(new TypeError('x'))).toEqual({
      name: 'TypeError',
      message: 'x',
    });
    expect(ErrorDescriptor.describe(malformed)).toEqual({
      name: 'Error',
      message: 'x',
    });
  });

  it('describes values that are not errors', () => {
    expect(ErrorDescriptor.describe('text')).toEqual({
      name: 'string',
      message: 'text',
    });
    expect(ErrorDescriptor.describe(undefined)).toEqual({
      name: 'undefined',
      message: 'undefined',
    });
  });

  it.each([
    ['valid code', { code: 'A.B.C' }, 'A.B.C'],
    ['invalid code', { code: 'nope' }, undefined],
    ['numeric code', { code: 5 }, undefined],
    ['no code', {}, undefined],
    ['null', null, undefined],
    ['primitive', 'A.B.C', undefined],
  ])('codeOf with %s', (_label, value, expected) => {
    expect(ErrorDescriptor.codeOf(value)).toBe(expected);
  });
});
