import { SecurityHeaders } from '../security-headers.js';

describe('SecurityHeaders', () => {
  it('sends the base headers on any path', () => {
    expect(SecurityHeaders.forPath('/v1/items')).toEqual({
      'strict-transport-security': 'max-age=63072000; includeSubDomains',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'",
    });
  });

  it('adds no-store on the auth routes', () => {
    expect(SecurityHeaders.forPath('/v1/auth/session')).toMatchObject({
      'cache-control': 'no-store',
    });
  });
});
