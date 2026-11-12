import { z } from 'zod';
import {
  Access,
  defineRoute,
  defineServiceContract,
  HttpMethod,
  IdSchema,
  platformContract,
} from '@contracts/platform';
import { buildExport, JSON_SCHEMA_DIALECT, schemaRef } from './build-export.js';
import { contracts } from './registry.js';

type Obj = Record<string, unknown>;

/** Recorre el JSON y devuelve todos los valores de `$ref`. */
function refs(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((v) => refs(v, found));
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string') found.push(child);
      else refs(child, found);
    }
  }
  return found;
}

describe('schemaRef', () => {
  it('uses a local pointer inside the same service and a relative file otherwise', () => {
    expect(schemaRef('identity', 'identity', 'SignInRequest')).toBe(
      '#/schemas/SignInRequest',
    );
    expect(schemaRef('identity', 'platform', 'Id')).toBe(
      '../../platform/export/contract.json#/schemas/Id',
    );
  });
});

describe('buildExport', () => {
  const exported = buildExport(contracts);

  it('exports one document per registered service', () => {
    expect([...exported.keys()]).toEqual(['platform', 'identity']);
    const identity = exported.get('identity') as Obj;
    expect(identity['jsonSchemaDialect']).toBe(JSON_SCHEMA_DIALECT);
    expect(identity['service']).toBe('identity');
  });

  it('resolves every $ref to a schema of some service', () => {
    for (const [service, doc] of exported) {
      for (const ref of refs(doc)) {
        const match =
          /^(?:\.\.\/\.\.\/([a-z-]+)\/export\/contract\.json)?#\/schemas\/(\w+)$/.exec(
            ref,
          );
        expect(match).not.toBeNull();
        const target = exported.get(match?.[1] ?? service) as Obj;
        expect(target['schemas']).toHaveProperty(match?.[2] ?? '');
      }
    }
  });

  it('strips $schema and $id from each schema', () => {
    const schemas = (exported.get('platform') as Obj)['schemas'] as Obj;
    for (const schema of Object.values(schemas)) {
      expect(schema).not.toHaveProperty('$schema');
      expect(schema).not.toHaveProperty('$id');
    }
  });

  it('exports enums, constants, routes, operations, events and errors', () => {
    const identity = exported.get('identity') as Obj;
    expect((identity['enums'] as Obj)['Permission']).toEqual({
      values: [
        { name: 'TasksRead', value: 'tasks:read' },
        { name: 'TasksWrite', value: 'tasks:write' },
        { name: 'BillingRead', value: 'billing:read' },
        { name: 'BackofficeAccess', value: 'backoffice:access' },
      ],
    });
    expect((identity['constants'] as Obj)['MfaRules']).toMatchObject({
      deviceCodeLength: 8,
    });
    const routes = identity['routes'] as Obj[];
    expect(routes.find((r) => r['name'] === 'revokeSession')).toMatchObject({
      method: 'DELETE',
      pathParams: ['sessionId'],
      requestLocation: 'query',
      response: null,
      successStatus: 204,
    });
    const ops = identity['operations'] as Obj[];
    expect(ops.find((o) => o['name'] === 'revokeUserSessions')).toMatchObject({
      mutating: true,
      compensatedBy: 'none',
    });
    expect((identity['events'] as Obj[])[0]).toMatchObject({
      type: 'identity.session.revoked.v1',
      version: 1,
    });
    const errors = (identity['errors'] as Obj)['IdentityErrorCode'] as Obj[];
    expect(errors[0]).toMatchObject({
      name: 'AuthInvalidCredentials',
      messageKey: 'error_identity_auth_invalid_credentials',
      audience: 'public',
    });
  });

  it('fails when a route uses an unregistered schema', () => {
    const route = defineRoute({
      id: 'sample.items.get',
      method: HttpMethod.Get,
      path: '/v1/items',
      request: z.strictObject({ id: IdSchema }),
      access: Access.public(),
      description: 'x',
    });
    const sample = defineServiceContract({
      service: 'sample',
      description: 'x',
      routes: { getItem: route },
    });
    expect(() => buildExport([platformContract, sample])).toThrow(
      /esquema sin nombre/,
    );
  });

  it('fails when a route declares an unknown error code', () => {
    const Req = z.strictObject({});
    const sample = defineServiceContract({
      service: 'sample',
      description: 'x',
      schemas: { Req },
      routes: {
        getItem: defineRoute({
          id: 'sample.items.get',
          method: HttpMethod.Get,
          path: '/v1/items',
          request: Req,
          errors: ['SAMPLE.ITEMS.MISSING'],
          access: Access.public(),
          description: 'x',
        }),
      },
    });
    expect(() => buildExport([platformContract, sample])).toThrow(
      /no está en ningún catálogo/,
    );
  });

  it('fails when two services register the same schema', () => {
    const sample = defineServiceContract({
      service: 'sample',
      description: 'x',
      schemas: { Id: IdSchema },
    });
    expect(() => buildExport([platformContract, sample])).toThrow(
      /ya está registrado/,
    );
  });
});
