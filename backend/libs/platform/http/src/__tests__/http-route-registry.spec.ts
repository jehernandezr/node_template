import {
  Access,
  defineRoute,
  defineServiceContract,
  HttpMethod,
  type RouteDefinition,
} from '@contracts/platform';
import { AuthMethod } from '../auth-method.enum.js';
import { HttpRouteRegistry } from '../http-route-registry.js';
import type { RegisteredEndpoint } from '../registered-endpoint.js';

const listRoute = defineRoute({
  id: 'demo.items.list',
  method: HttpMethod.Get,
  path: '/v1/items',
  access: Access.authenticated(),
  description: 'Lista.',
});
const openRoute = defineRoute({
  id: 'demo.open.get',
  method: HttpMethod.Get,
  path: '/v1/open',
  access: Access.public(),
  description: 'Pública.',
});

function entry(
  route: RouteDefinition,
  auth?: readonly AuthMethod[],
): RegisteredEndpoint {
  return {
    route,
    options: auth === undefined ? {} : { auth },
    resource: { name: 'items', options: {} },
    controller: 'ItemsController',
    handler: 'list',
  };
}

function contractOf(routes: Record<string, RouteDefinition>) {
  return defineServiceContract({
    service: 'demo',
    description: 'Prueba.',
    routes,
  });
}

describe('HttpRouteRegistry', () => {
  it('finds a registered route by its id and returns its path', () => {
    const registry = new HttpRouteRegistry();
    registry.register(entry(listRoute));

    expect(registry.findByRouteId('demo.items.list')).toMatchObject({
      handler: 'list',
    });
    expect(registry.pathOfRoute('demo.items.list')).toBe('/v1/items');
    expect(registry.pathOfRoute('demo.none.get')).toBeUndefined();
  });

  it('rejects two handlers for the same method and path', () => {
    const registry = new HttpRouteRegistry();
    registry.register(entry(listRoute));

    expect(() => registry.register(entry(listRoute))).toThrow('GET /v1/items');
  });

  it('rejects a public route that declares auth', () => {
    const registry = new HttpRouteRegistry();

    expect(() => registry.register(entry(openRoute, [AuthMethod.Jwt]))).toThrow(
      'no puede declarar auth',
    );
  });

  it('passes when every contract route has a handler', () => {
    const registry = new HttpRouteRegistry();
    registry.register(entry(listRoute));

    expect(() =>
      registry.assertComplete(contractOf({ list: listRoute })),
    ).not.toThrow();
  });

  it('lists routes without handler and handlers outside the contract', () => {
    const registry = new HttpRouteRegistry();
    registry.register(entry(listRoute));

    expect(() =>
      registry.assertComplete(contractOf({ open: openRoute })),
    ).toThrow(
      'sin handler: demo.open.get; fuera del contrato: demo.items.list',
    );
  });

  it('lists only the missing routes when there are no extra handlers', () => {
    const registry = new HttpRouteRegistry();

    expect(() =>
      registry.assertComplete(contractOf({ list: listRoute })),
    ).toThrow('sin handler: demo.items.list');
  });

  it('lists only the extra handlers when every contract route has one', () => {
    const registry = new HttpRouteRegistry();
    registry.register(entry(listRoute));
    registry.register(entry(openRoute));

    expect(() =>
      registry.assertComplete(contractOf({ list: listRoute })),
    ).toThrow('fuera del contrato: demo.open.get');
  });
});
