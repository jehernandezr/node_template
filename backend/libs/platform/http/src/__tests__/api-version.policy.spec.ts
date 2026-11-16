import { ApiVersionPolicy } from '../api-version.policy.js';
import { HttpLimits } from '../http-limits.js';
import { VersionTransformer } from '../version-transformer.js';

const NEXT = '2027-01-01';

class ConstantTransformer extends VersionTransformer {
  readonly fromVersion = '2025-01-01';

  transformRequest(_routeId: string, input: unknown): unknown {
    return input;
  }

  transformResponse(_routeId: string, output: unknown): unknown {
    return output;
  }
}

describe('ApiVersionPolicy', () => {
  it('uses the header when it is supported', () => {
    expect(new ApiVersionPolicy().resolve(HttpLimits.CURRENT_API_VERSION)).toBe(
      HttpLimits.CURRENT_API_VERSION,
    );
  });

  it('uses the pinned version when no header comes and it is supported', () => {
    const policy = new ApiVersionPolicy([HttpLimits.CURRENT_API_VERSION, NEXT]);

    expect(policy.resolve(undefined, NEXT)).toBe(NEXT);
  });

  it('uses the current version when no header comes and the pinned one is not supported', () => {
    expect(new ApiVersionPolicy().resolve(undefined, '2000-01-01')).toBe(
      HttpLimits.CURRENT_API_VERSION,
    );
  });

  it('uses the current version when no header and no pin come', () => {
    expect(new ApiVersionPolicy().resolve(undefined)).toBe(
      HttpLimits.CURRENT_API_VERSION,
    );
  });

  it.each([
    ['a malformed date', '2026/11/01'],
    ['an unsupported date', '1999-01-01'],
    ['a repeated header', [HttpLimits.CURRENT_API_VERSION, NEXT]],
  ])('rejects %s', (_label, header) => {
    expect(() => new ApiVersionPolicy().resolve(header)).toThrow(
      expect.objectContaining({ code: 'PLATFORM.API.UNSUPPORTED_VERSION' }),
    );
  });

  it('asserts that the route accepts the version', () => {
    const policy = new ApiVersionPolicy();

    expect(() =>
      policy.assertAccepts(HttpLimits.CURRENT_API_VERSION),
    ).not.toThrow();
    expect(() =>
      policy.assertAccepts(HttpLimits.CURRENT_API_VERSION, [NEXT]),
    ).toThrow(
      expect.objectContaining({ code: 'PLATFORM.API.UNSUPPORTED_VERSION' }),
    );
    expect(() =>
      policy.assertAccepts(HttpLimits.CURRENT_API_VERSION, [
        HttpLimits.CURRENT_API_VERSION,
      ]),
    ).not.toThrow();
  });

  it('exposes the transformer contract with its version', () => {
    expect(new ConstantTransformer().fromVersion).toBe('2025-01-01');
    expect(new ConstantTransformer().transformRequest('r', 1)).toBe(1);
    expect(new ConstantTransformer().transformResponse('r', 2)).toBe(2);
  });
});
