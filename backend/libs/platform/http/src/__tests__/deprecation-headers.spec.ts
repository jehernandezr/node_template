import { Access, defineRoute, HttpMethod } from '@contracts/platform';
import { DeprecationHeaders } from '../deprecation-headers.js';

const plain = defineRoute({
  id: 'demo.plain.get',
  method: HttpMethod.Get,
  path: '/v1/plain',
  access: Access.public(),
  description: 'Sin deprecar.',
});
const deprecated = defineRoute({
  id: 'demo.old.get',
  method: HttpMethod.Get,
  path: '/v1/old',
  access: Access.public(),
  deprecated: {
    since: '2026-01-01',
    sunset: '2026-06-01',
    replacement: 'demo.new.get',
  },
  description: 'Deprecada.',
});

describe('DeprecationHeaders', () => {
  it('sends nothing for a route that is not deprecated', () => {
    expect(DeprecationHeaders.forRoute(plain, '/v1/new')).toEqual({});
    expect(
      DeprecationHeaders.isSunset(plain, new Date('2100-01-01T00:00:00Z')),
    ).toBe(false);
  });

  it('sends Deprecation, Sunset and Link with the replacement path', () => {
    expect(DeprecationHeaders.forRoute(deprecated, '/v1/new')).toEqual({
      deprecation: '@1767225600',
      sunset: 'Mon, 01 Jun 2026 00:00:00 GMT',
      link: '</v1/new>; rel="successor-version"',
    });
  });

  it('omits Link without a replacement path', () => {
    expect(DeprecationHeaders.forRoute(deprecated)).not.toHaveProperty('link');
  });

  it('is sunset from midnight UTC of the sunset date', () => {
    expect(
      DeprecationHeaders.isSunset(deprecated, new Date('2026-05-31T23:59:59Z')),
    ).toBe(false);
    expect(
      DeprecationHeaders.isSunset(deprecated, new Date('2026-06-01T00:00:00Z')),
    ).toBe(true);
  });
});
