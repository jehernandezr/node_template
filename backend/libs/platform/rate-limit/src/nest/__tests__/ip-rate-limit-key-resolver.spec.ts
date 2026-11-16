import { IpRateLimitKeyResolver } from '../ip-rate-limit-key-resolver.js';
import { RateLimitKey } from '../rate-limit-key.enum.js';
import { FakeHttpExecutionContext } from './utils/fake-http-execution-context.js';

class ProbeController {}

describe('IpRateLimitKeyResolver', () => {
  it.each<[string, { ip?: string }, string]>([
    ['the request ip', { ip: '10.0.0.7' }, '10.0.0.7'],
    ['an absent ip', {}, RateLimitKey.Anonymous],
    ['an empty ip', { ip: '' }, RateLimitKey.Anonymous],
  ])('resolves %s', (_label, request, expected) => {
    const context = new FakeHttpExecutionContext(
      request,
      ProbeController,
      () => undefined,
    );
    expect(new IpRateLimitKeyResolver().resolve(context)).toBe(expected);
  });
});
