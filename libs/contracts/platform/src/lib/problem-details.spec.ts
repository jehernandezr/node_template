import { platformErrorCatalog } from './error-catalog.js';
import { toProblemDetails } from './problem-details.js';
import { PlatformErrorCode } from './platform-error-code.js';

describe('toProblemDetails', () => {
  const entry = platformErrorCatalog.find(
    (e) => e.code === PlatformErrorCode.ValidationRequired,
  );
  if (!entry)
    throw new Error('Falta la entrada de PLATFORM.VALIDATION.REQUIRED');
  const typeBaseUrl = 'https://docs.example.com';

  it('builds the minimal shape from the catalog entry', () => {
    const problem = toProblemDetails({
      entry,
      title: 'Falta un dato',
      typeBaseUrl,
    });
    expect(problem).toEqual({
      type: 'https://docs.example.com/errors/PLATFORM.VALIDATION.REQUIRED',
      title: 'Falta un dato',
      status: 400,
      code: 'PLATFORM.VALIDATION.REQUIRED',
    });
    expect(problem).not.toHaveProperty('detail');
    expect(problem).not.toHaveProperty('traceId');
  });

  it('includes optional fields when provided', () => {
    const problem = toProblemDetails({
      entry,
      title: 'Falta un dato',
      detail: 'Indica el código.',
      instance: '/v1/mfa/verify',
      traceId: '0193f1c2-abcd',
      errors: [{ field: 'code', code: PlatformErrorCode.ValidationRequired }],
      typeBaseUrl,
    });
    expect(problem).toEqual({
      type: 'https://docs.example.com/errors/PLATFORM.VALIDATION.REQUIRED',
      title: 'Falta un dato',
      status: 400,
      code: 'PLATFORM.VALIDATION.REQUIRED',
      detail: 'Indica el código.',
      instance: '/v1/mfa/verify',
      traceId: '0193f1c2-abcd',
      errors: [{ field: 'code', code: 'PLATFORM.VALIDATION.REQUIRED' }],
    });
  });
});
