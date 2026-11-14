import { FailureKind, PlatformError } from '@platform/kernel';
import { DuplicateHealthCheckError } from '../duplicate-health-check.error.js';
import { ObservabilityErrorCode } from '../observability-error-code.enum.js';

describe('DuplicateHealthCheckError', () => {
  it('carries the duplicate health check code and protocol failure kind', () => {
    const error = new DuplicateHealthCheckError('database');

    expect(error).toBeInstanceOf(PlatformError);
    expect(error).toMatchObject({
      code: ObservabilityErrorCode.DuplicateHealthCheck,
      failureKind: FailureKind.ProtocolViolation,
    });
  });

  it('names the duplicated check in the details and the message', () => {
    const error = new DuplicateHealthCheckError('database');

    expect(error.details).toEqual({ name: 'database' });
    expect(error.message).toContain('"database"');
  });
});
