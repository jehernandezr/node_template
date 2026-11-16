import { IdentityErrorCode } from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { HttpProblemError } from '../http-problem.error.js';

describe('HttpProblemError', () => {
  it.each([
    [
      'invalidInput',
      () => HttpProblemError.invalidInput([{ field: 'name', code: 'x' }]),
      PlatformErrorCode.ValidationInvalidInput,
    ],
    [
      'payloadTooLarge',
      () => HttpProblemError.payloadTooLarge(),
      PlatformErrorCode.HttpPayloadTooLarge,
    ],
    [
      'unsupportedMediaType',
      () => HttpProblemError.unsupportedMediaType(),
      PlatformErrorCode.HttpUnsupportedMediaType,
    ],
    [
      'malformedBody',
      () => HttpProblemError.malformedBody(),
      PlatformErrorCode.HttpMalformedBody,
    ],
    [
      'originRejected',
      () => HttpProblemError.originRejected(),
      PlatformErrorCode.AuthOriginRejected,
    ],
    [
      'unsupportedVersion',
      () => HttpProblemError.unsupportedVersion('1999-01-01'),
      PlatformErrorCode.ApiUnsupportedVersion,
    ],
    [
      'versionSunset',
      () => HttpProblemError.versionSunset('demo.gone.get'),
      PlatformErrorCode.ApiVersionSunset,
    ],
    [
      'notFound',
      () => HttpProblemError.notFound(),
      PlatformErrorCode.ResourceNotFound,
    ],
    [
      'forbidden',
      () => HttpProblemError.forbidden(['tasks:read']),
      PlatformErrorCode.AuthForbidden,
    ],
    [
      'stepUpRequired',
      () => HttpProblemError.stepUpRequired(),
      IdentityErrorCode.MfaStepUpRequired,
    ],
    [
      'rateLimited',
      () => HttpProblemError.rateLimited(3),
      PlatformErrorCode.RateLimitExceeded,
    ],
    [
      'timeout',
      () => HttpProblemError.timeout(),
      PlatformErrorCode.ResilienceTimeout,
    ],
  ])('%s carries its code', (_name, build, code) => {
    expect(build()).toMatchObject({ code });
  });

  it('keeps the field errors of an invalid input', () => {
    const error = HttpProblemError.invalidInput([
      { field: 'name', code: PlatformErrorCode.ValidationRequired },
    ]);

    expect(error.fieldErrors).toEqual([
      { field: 'name', code: PlatformErrorCode.ValidationRequired },
    ]);
  });

  it('marks a rate-limited error as retryable with its wait', () => {
    const error = HttpProblemError.rateLimited(7);

    expect(error).toMatchObject({ retryable: true, retryAfterSeconds: 7 });
  });

  it('marks a timeout as retryable', () => {
    expect(HttpProblemError.timeout()).toMatchObject({ retryable: true });
  });

  it('puts the version in the details of an unsupported version', () => {
    expect(HttpProblemError.unsupportedVersion('1999-01-01').details).toEqual({
      version: '1999-01-01',
    });
  });

  it('puts the missing permissions in the details of a forbidden error', () => {
    expect(HttpProblemError.forbidden(['tasks:read']).details).toEqual({
      missing: ['tasks:read'],
    });
  });

  it('is not retryable by default', () => {
    expect(HttpProblemError.notFound()).toMatchObject({ retryable: false });
  });
});
