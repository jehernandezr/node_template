import {
  Access,
  defineErrorCatalog,
  defineRoute,
  defineServiceContract,
  ErrorSpecs,
  HttpMethod,
  PlatformErrorCode,
  type RouteDefinition,
} from '@contracts/platform';
import { authErrorCatalog } from '@platform/auth';
import { ErrorCatalogRegistry } from '../error-catalog-registry.js';

enum ServiceCode {
  Taken = 'DEMO.ITEM.TAKEN',
}

const serviceCatalog = defineErrorCatalog(ServiceCode, {
  [ServiceCode.Taken]: ErrorSpecs.pub(409, false, 'Ya existe.'),
});

function routeWithErrors(
  id: string,
  path: string,
  errors: string[],
): RouteDefinition {
  return defineRoute({
    id,
    method: HttpMethod.Get,
    path,
    errors,
    access: Access.public(),
    description: 'Ruta de prueba.',
  });
}

describe('ErrorCatalogRegistry', () => {
  it('knows the platform, auth and identity codes without extra catalogs', () => {
    const registry = new ErrorCatalogRegistry([]);

    expect(registry.get(PlatformErrorCode.AuthForbidden)).toMatchObject({
      httpStatus: 403,
    });
    expect(registry.get('IDENTITY.MFA.STEP_UP_REQUIRED')).toMatchObject({
      httpStatus: 403,
    });
    expect(registry.get('AUTH.TOKEN.EXPIRED')).toBeUndefined();
  });

  it('registers the service catalogs', () => {
    const registry = new ErrorCatalogRegistry([serviceCatalog]);

    expect(registry.get(ServiceCode.Taken)).toMatchObject({ httpStatus: 409 });
  });

  it('accepts a library catalog repeated by the service', () => {
    const registry = new ErrorCatalogRegistry([authErrorCatalog]);

    expect(registry.get(PlatformErrorCode.AuthUnauthenticated)).toBeDefined();
  });

  it('rejects a service code defined twice with different definitions', () => {
    const conflicting = defineErrorCatalog(
      { Taken: ServiceCode.Taken } as const,
      { [ServiceCode.Taken]: ErrorSpecs.pub(500, false, 'Otro.') },
    );

    expect(
      () => new ErrorCatalogRegistry([serviceCatalog, conflicting]),
    ).toThrow('Código de error duplicado con otra definición');
  });

  it('passes a contract whose codes are all registered', () => {
    const registry = new ErrorCatalogRegistry([serviceCatalog]);
    const contract = defineServiceContract({
      service: 'demo',
      description: 'Prueba.',
      routes: {
        get: routeWithErrors('demo.items.get', '/v1/items', [
          ServiceCode.Taken,
        ]),
      },
    });

    expect(() => registry.assertCovers(contract)).not.toThrow();
  });

  it('lists every missing code once and sorted', () => {
    const registry = new ErrorCatalogRegistry([]);
    const contract = defineServiceContract({
      service: 'demo',
      description: 'Prueba.',
      routes: {
        first: routeWithErrors('demo.items.first', '/v1/first', [
          'DEMO.Z.LATE',
          'DEMO.A.EARLY',
        ]),
        second: routeWithErrors('demo.items.second', '/v1/second', [
          'DEMO.Z.LATE',
        ]),
      },
    });

    expect(() => registry.assertCovers(contract)).toThrow(
      'Códigos de error sin entrada en el catálogo: DEMO.A.EARLY, DEMO.Z.LATE',
    );
  });
});
