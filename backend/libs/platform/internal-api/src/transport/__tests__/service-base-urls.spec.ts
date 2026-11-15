import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { ServiceBaseUrls } from '../service-base-urls.js';

describe('ServiceBaseUrls', () => {
  describe('urlFor', () => {
    it('returns the base URL of the service that owns the operation', () => {
      const urls = new ServiceBaseUrls({
        billing: 'http://billing.test:3000',
        identity: 'http://identity.test:3000',
      });

      expect(urls.urlFor('identity.sessions.revoke.v1')).toBe(
        'http://identity.test:3000',
      );
    });

    it('removes the trailing slashes of the base URL', () => {
      const urls = new ServiceBaseUrls({
        billing: 'http://billing.test:3000//',
      });

      expect(urls.urlFor('billing.invoices.create.v1')).toBe(
        'http://billing.test:3000',
      );
    });

    it('rejects an operation whose service has no base URL', () => {
      const urls = new ServiceBaseUrls({ billing: 'http://billing.test:3000' });

      expect(() => urls.urlFor('payments.charges.create.v1')).toThrow(
        expect.objectContaining({
          code: InternalApiErrorCode.UnknownService,
        }),
      );
    });
  });

  describe('construction', () => {
    it.each([
      ['a value that is not a URL', 'no es url'],
      ['a URL with a scheme other than http or https', 'ftp://billing'],
    ])('rejects %s', (_label, raw) => {
      expect(() => new ServiceBaseUrls({ billing: raw })).toThrow(
        expect.objectContaining({
          code: InternalApiErrorCode.InvalidConfiguration,
        }),
      );
    });
  });
});
