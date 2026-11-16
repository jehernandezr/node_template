import { identityContract, IdentityErrorCode } from '@contracts/identity';
import { ErrorCatalog, platformErrorCatalog } from '@contracts/platform';
import { authErrorCatalog } from '@platform/auth';
import { IDENTITY_ERROR_CATALOGS } from '../identity-error-catalogs.constants.js';

describe('IDENTITY_ERROR_CATALOGS', () => {
  const registerAll = (): ErrorCatalog => {
    const catalog = new ErrorCatalog();
    catalog.register(platformErrorCatalog);
    catalog.register(authErrorCatalog);
    for (const entries of IDENTITY_ERROR_CATALOGS) {
      catalog.register(entries);
    }
    return catalog;
  };

  it('registers with the platform and auth catalogs without throwing', () => {
    expect(registerAll).not.toThrow();
  });

  it('has an entry for every error code that an identity route declares', () => {
    const catalog = registerAll();
    const declared = Object.values(identityContract.routes).flatMap(
      (route) => route.errors,
    );

    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter((code) => catalog.get(code) === undefined)).toEqual(
      [],
    );
  });

  it('includes the identity error codes of the contract', () => {
    expect(registerAll().get(IdentityErrorCode.SessionRevoked)).toBeDefined();
  });
});
