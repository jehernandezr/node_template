import { FailureClassifier } from '@platform/primitives';
import { FailureKind } from '@platform/kernel';
import { InternalApiError } from '../internal-api-error.js';
import { InternalApiErrorCode } from '../internal-api-error-code.enum.js';

describe('InternalApiError', () => {
  it('carries its code and details', () => {
    const error = new InternalApiError(
      InternalApiErrorCode.UnknownService,
      'No base URL',
      { service: 'billing' },
    );

    expect(error).toMatchObject({
      code: InternalApiErrorCode.UnknownService,
      details: { service: 'billing' },
    });
  });

  it('is a protocol violation for the failure classifier', () => {
    const error = new InternalApiError(
      InternalApiErrorCode.InvalidOutput,
      'Bad output',
    );

    expect(new FailureClassifier().classify(error)).toBe(
      FailureKind.ProtocolViolation,
    );
  });
});
