import { z } from 'zod';
import {
  Access,
  defineCommand,
  defineQueue,
  defineRoute,
  defineServiceContract,
  HttpMethod,
  IdSchema,
  platformContract,
} from '@contracts/platform';
import { GlobalUniquenessChecker } from '../global-uniqueness-checker.js';
import type { JsonObject } from '../json.type.js';
import { SchemaExportBuilder } from '../schema-export-builder.js';
import { SchemaOwnership } from '../schema-ownership.js';
import { ContractFixtures } from './utils/contract-fixtures.js';

type Obj = Record<string, unknown>;

const REF_PATTERN = /"\$ref":"([^"]+)"/g;
const REF_TARGET =
  /^(?:\.\.\/\.\.\/([a-z-]+)\/export\/contract\.json)?#\/schemas\/(\w+)$/;
const PLATFORM_PREFIX = '../../platform/export/contract.json#/schemas/';

/** Devuelve todos los valores de `$ref` que aparecen en el JSON. */
function refsOf(value: unknown): string[] {
  return [...JSON.stringify(value).matchAll(REF_PATTERN)].map(
    (match) => match[1] ?? '',
  );
}

/** Indica si el `$ref` apunta a un esquema existente en el servicio que lo declara o en el indicado. */
function resolves(
  exported: Map<string, JsonObject>,
  ref: string,
  service: string,
): boolean {
  const match = REF_TARGET.exec(ref);
  const schemas = exported.get(match?.[1] ?? service)?.['schemas'];
  return (
    match !== null &&
    typeof schemas === 'object' &&
    schemas !== null &&
    (match[2] ?? '') in schemas
  );
}

const builder = new SchemaExportBuilder(
  new SchemaOwnership(),
  new GlobalUniquenessChecker(),
);

describe('SchemaExportBuilder', () => {
  describe('build', () => {
    const exported = builder.build(ContractFixtures.registered());

    it('exports one document per registered service', () => {
      expect([...exported.keys()]).toEqual(['platform', 'identity', 'billing']);
      const identity = exported.get('identity') as Obj;
      expect(identity['jsonSchemaDialect']).toBe(
        'https://json-schema.org/draft/2020-12/schema',
      );
      expect(identity['service']).toBe('identity');
    });

    it('uses a local pointer inside the same service and a relative file for other services', () => {
      const identityRefs = refsOf(exported.get('identity'));

      expect(identityRefs.some((ref) => ref.startsWith(PLATFORM_PREFIX))).toBe(
        true,
      );
      expect(identityRefs.some((ref) => ref.startsWith('#/schemas/'))).toBe(
        true,
      );
    });

    it('resolves every $ref to a schema of some service', () => {
      const dangling = [...exported].flatMap(([service, doc]) =>
        refsOf(doc).filter((ref) => !resolves(exported, ref, service)),
      );

      expect(dangling).toEqual([]);
    });

    it('strips $schema and $id from each schema', () => {
      const schemas = (exported.get('platform') as Obj)['schemas'] as Obj;
      const keys = Object.values(schemas).flatMap((schema) =>
        Object.keys(schema as Obj),
      );

      expect(keys).not.toContain('$schema');
      expect(keys).not.toContain('$id');
    });

    it('exports enums, constants, routes, operations, events and errors', () => {
      const identity = exported.get('identity') as Obj;

      expect((identity['enums'] as Obj)['Permission']).toMatchObject({
        values: expect.arrayContaining([
          { name: 'TasksRead', value: 'tasks:read' },
          { name: 'TasksWrite', value: 'tasks:write' },
          { name: 'BillingRead', value: 'billing:read' },
          { name: 'BillingWrite', value: 'billing:write' },
          { name: 'BackofficeAccess', value: 'backoffice:access' },
        ]),
      });
      expect((identity['constants'] as Obj)['MfaRules']).toMatchObject({
        deviceCodeLength: 8,
      });
      const routes = identity['routes'] as Obj[];
      expect(routes.find((r) => r['name'] === 'revokeSession')).toMatchObject({
        method: 'DELETE',
        pathParams: ['sessionId'],
        requestLocation: 'query',
        version: 1,
        queryParams: [],
        response: null,
        successStatus: 204,
      });
      expect(routes.find((r) => r['name'] === 'listSessions')).toMatchObject({
        queryParams: [
          { name: 'limit', kind: 'number', list: false },
          { name: 'after', kind: 'string', list: false },
        ],
      });
      const ops = identity['operations'] as Obj[];
      expect(ops.find((o) => o['name'] === 'revokeUserSessions')).toMatchObject(
        {
          id: 'identity.sessions.revoke-for-user.v1',
          version: 1,
          mutating: true,
          compensatedBy: 'none',
        },
      );
      expect((identity['events'] as Obj[])[0]).toMatchObject({
        type: 'identity.session.revoked.v1',
        kind: 'event',
        version: 1,
      });
      expect(identity['commands']).toEqual([
        expect.objectContaining({
          type: 'identity.password-reset.send.v1',
          kind: 'command',
          payload: { $ref: '#/schemas/PasswordResetRequest' },
        }),
      ]);
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

      expect(() => builder.build([platformContract, sample])).toThrow(
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

      expect(() => builder.build([platformContract, sample])).toThrow(
        /no está en ningún catálogo/,
      );
    });

    it('fails when two services register the same schema', () => {
      const sample = defineServiceContract({
        service: 'sample',
        description: 'x',
        schemas: { Id: IdSchema },
      });

      expect(() => builder.build([platformContract, sample])).toThrow(
        /ya está registrado/,
      );
    });
  });

  describe('build with commands, deprecations and shared ids', () => {
    const Payload = z.object({ itemId: IdSchema });
    const generate = defineCommand({
      type: 'sample.report.generate.v1',
      payload: Payload,
      description: 'Genera.',
    });
    const legacy = defineRoute({
      id: 'sample.items.legacy',
      method: HttpMethod.Post,
      path: '/v1/legacy',
      request: Payload,
      access: Access.public(),
      deprecated: {
        since: '2026-11-01',
        sunset: '2027-05-01',
        replacement: 'sample.items.legacy',
      },
      description: 'x',
    });
    const sample = defineServiceContract({
      service: 'sample',
      description: 'x',
      schemas: { SamplePayload: Payload },
      routes: { legacy },
      commands: { generate },
      queues: {
        commands: defineQueue({
          name: 'sample-commands',
          commands: [generate],
          description: 'x',
        }),
      },
    });

    it('exports commands and the deprecation of a route', () => {
      const doc = builder
        .build([platformContract, sample])
        .get('sample') as Obj;

      expect(doc['commands']).toEqual([
        {
          name: 'generate',
          type: 'sample.report.generate.v1',
          kind: 'command',
          version: 1,
          payload: { $ref: '#/schemas/SamplePayload' },
          description: 'Genera.',
        },
      ]);
      expect((doc['routes'] as Obj[])[0]?.['deprecated']).toEqual({
        since: '2026-11-01',
        sunset: '2027-05-01',
        replacement: 'sample.items.legacy',
      });
    });

    it('fails when two services declare the same id', () => {
      const other = { ...sample, service: 'other' };

      expect(() => builder.build([sample, other])).toThrow(
        /ya está declarado en sample/,
      );
    });
  });
});
