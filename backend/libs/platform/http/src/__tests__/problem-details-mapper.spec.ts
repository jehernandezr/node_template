import {
  ProblemDetailsFactory,
  PlatformErrorCode,
  ErrorAudience,
  defineErrorCatalog,
  ErrorSpecs,
} from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import { ErrorCatalogRegistry } from '../error-catalog-registry.js';
import { HttpProblemError } from '../http-problem.error.js';
import { ProblemDetailsMapper } from '../problem-details-mapper.js';

enum InternalCode {
  Hidden = 'DEMO.SECRET.HIDDEN',
}

const internalCatalog = defineErrorCatalog(InternalCode, {
  [InternalCode.Hidden]: ErrorSpecs.internal(503, true, 'Interno.'),
});

class UnknownCodeError extends PlatformError {
  override readonly code = 'DEMO.NOT.REGISTERED';
}

class DetailedError extends PlatformError {
  override readonly code = PlatformErrorCode.RateLimitExceeded;
}

class InternalCoded extends PlatformError {
  override readonly code = InternalCode.Hidden;
}

const context = { instance: '/v1/items', traceId: 'a'.repeat(32) };

function mapperWith(catalogs = [internalCatalog]) {
  const registry = new ErrorCatalogRegistry(catalogs);
  return new ProblemDetailsMapper(
    registry,
    new ProblemDetailsFactory('https://docs.test'),
  );
}

describe('ProblemDetailsMapper', () => {
  it('maps an http problem to its catalog entry with the title and the trace', () => {
    const response = mapperWith().map(HttpProblemError.notFound(), context);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      type: 'https://docs.test/errors/PLATFORM.RESOURCE.NOT_FOUND',
      title: 'El recurso solicitado no existe.',
      status: 404,
      code: PlatformErrorCode.ResourceNotFound,
      instance: '/v1/items',
      traceId: context.traceId,
    });
    expect(response.headers).toEqual({
      'content-type': 'application/problem+json',
    });
  });

  it('never exposes the message or the detail of the error', () => {
    const response = mapperWith().map(
      HttpProblemError.forbidden(['x']),
      context,
    );

    expect(response.body).not.toHaveProperty('detail');
    expect(JSON.stringify(response.body)).not.toContain('Access denied');
  });

  it('includes the field errors of an invalid input', () => {
    const errors = [
      { field: 'name', code: PlatformErrorCode.ValidationRequired },
    ];
    const response = mapperWith().map(
      HttpProblemError.invalidInput(errors),
      context,
    );

    expect(response.body).toMatchObject({ errors });
  });

  it('maps an unknown error to the unexpected entry', () => {
    const response = mapperWith().map(new Error('secret'), context);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: PlatformErrorCode.InternalUnexpected,
    });
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });

  it('maps a platform error with an unregistered code to the unexpected entry', () => {
    const response = mapperWith().map(new UnknownCodeError('nope'), context);

    expect(response).toMatchObject({ status: 500 });
    expect(response.body).toMatchObject({
      code: PlatformErrorCode.InternalUnexpected,
    });
  });

  it('answers an internal audience code as unexpected without field errors', () => {
    const response = mapperWith().map(new InternalCoded('internal'), context);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: PlatformErrorCode.InternalUnexpected,
    });
    expect(response.body).not.toHaveProperty('errors');
  });

  it('sends Retry-After from the error itself', () => {
    const response = mapperWith().map(HttpProblemError.rateLimited(4), context);

    expect(response.headers['retry-after']).toBe('4');
  });

  it('sends Retry-After from details.retryAfterSeconds', () => {
    const error = new DetailedError('limited', {
      details: { retryAfterSeconds: 2.2 },
    });

    expect(mapperWith().map(error, context).headers['retry-after']).toBe('3');
  });

  it('sends Retry-After from details.retryAfterMs rounded up to one second at least', () => {
    const error = new DetailedError('limited', {
      details: { retryAfterMs: 200 },
    });

    expect(mapperWith().map(error, context).headers['retry-after']).toBe('1');
  });

  it('omits Retry-After when the code is internal', () => {
    const error = new InternalCoded('internal', {
      details: { retryAfterSeconds: 9 },
    });

    expect(mapperWith().map(error, context).headers).not.toHaveProperty(
      'retry-after',
    );
  });

  it('omits Retry-After when no source has a value', () => {
    expect(
      mapperWith().map(HttpProblemError.notFound(), context).headers,
    ).not.toHaveProperty('retry-after');
  });

  it('uses the audience of the catalog to decide the public response', () => {
    expect(ErrorAudience.Internal).toBe('internal');
  });
});
