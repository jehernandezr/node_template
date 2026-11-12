import { z } from 'zod';
import { AccessKind } from '../enums/access-kind.enum.js';
import { Compensation } from '../enums/compensation.enum.js';
import { ErrorAudience } from '../enums/error-audience.enum.js';
import { HttpMethod } from '../enums/http-method.enum.js';
import { EmptySchema } from '../schemas/empty.schema.js';
import { IdSchema } from '../schemas/id.schema.js';
import { Access } from './access.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import { defineEvent } from './define-event.js';
import { defineOperation } from './define-operation.js';
import { defineRoute, usesQuery } from './define-route.js';
import { defineServiceContract } from './define-service-contract.js';
import { defineErrorCatalog } from './error-catalog.js';

const ItemRequest = z.strictObject({ itemId: IdSchema, name: z.string() });

describe('Access', () => {
  it('builds public and authenticated requirements', () => {
    expect(Access.public()).toEqual({ kind: AccessKind.Public });
    expect(Access.authenticated()).toEqual({ kind: AccessKind.Authenticated });
    expect(
      Access.authenticated({
        permissions: ['tasks:read'],
        platformRoles: [],
        mfaMaxAgeMinutes: 10,
      }),
    ).toEqual({
      kind: AccessKind.Authenticated,
      permissions: ['tasks:read'],
      mfaMaxAgeMinutes: 10,
    });
  });
});

describe('defineRoute', () => {
  it('extracts path params and defaults request, response and status', () => {
    const route = defineRoute({
      id: 'sample.items.update',
      method: HttpMethod.Put,
      path: '/v1/items/{itemId}',
      request: ItemRequest,
      response: ItemRequest,
      access: Access.authenticated(),
      description: 'Actualiza un ítem.',
    });
    expect(route.pathParams).toEqual(['itemId']);
    expect(route.successStatus).toBe(200);
    expect(route.errors).toEqual([]);

    const empty = defineRoute({
      id: 'sample.items.purge',
      method: HttpMethod.Delete,
      path: '/v1/items',
      access: Access.authenticated(),
      description: 'Borra todo.',
    });
    expect(empty.request).toBe(EmptySchema);
    expect(empty.response).toBeNull();
    expect(empty.successStatus).toBe(204);
  });

  it.each([
    [{ id: 'Bad Id' }, /id inválido/],
    [{ path: 'v1/items' }, /path inválido/],
    [{ path: '/v1/items/{missing}' }, /no está en request/],
    [{ path: '/v1/{itemId}/{itemId}' }, /repetidos/],
    [{ errors: ['bad'] }, /código inválido/],
    [{ errors: ['A.B.C', 'A.B.C'] }, /códigos repetidos/],
    [{ successStatus: 400 }, /estado de éxito/],
    [{ description: ' ' }, /descripción/],
  ])('rejects %j', (override, message) => {
    expect(() =>
      defineRoute({
        id: 'sample.items.get',
        method: HttpMethod.Get,
        path: '/v1/items/{itemId}',
        request: ItemRequest,
        access: Access.public(),
        description: 'Lee un ítem.',
        ...override,
      }),
    ).toThrow(message);
  });

  it('sends non-path fields in the query only for GET and DELETE', () => {
    expect(usesQuery(HttpMethod.Get)).toBe(true);
    expect(usesQuery(HttpMethod.Delete)).toBe(true);
    expect(usesQuery(HttpMethod.Post)).toBe(false);
  });
});

describe('defineOperation', () => {
  const base = {
    id: 'sample.items.create',
    input: ItemRequest,
    output: z.object({ ok: z.boolean() }),
    idempotent: true,
    description: 'Crea un ítem.',
  };

  it('accepts a compensated mutating operation with OperationOptions fields', () => {
    const op = defineOperation({
      ...base,
      compensatedBy: 'sample.items.delete',
      errors: ['SAMPLE.ITEMS.LOCKED'],
      timeoutMs: 1000,
      retry: { maxAttempts: 2, baseMs: 10, maxMs: 100 },
    });
    expect(op).toMatchObject({
      id: 'sample.items.create',
      mutating: true,
      idempotent: true,
      compensatedBy: 'sample.items.delete',
      errors: ['SAMPLE.ITEMS.LOCKED'],
      timeoutMs: 1000,
    });
    expect(op).not.toHaveProperty('compensationReason');
  });

  it('accepts Compensation.None with a reason and read-only operations', () => {
    expect(
      defineOperation({
        ...base,
        compensatedBy: Compensation.None,
        compensationReason: 'Irreversible por diseño.',
      }).compensatedBy,
    ).toBe('none');
    const read = defineOperation({ ...base, mutating: false });
    expect(read.mutating).toBe(false);
    expect(read).not.toHaveProperty('compensatedBy');
  });

  it('rejects missing compensations and bad metadata', () => {
    expect(() => defineOperation({ ...base } as never)).toThrow(
      /compensatedBy/,
    );
    expect(() =>
      defineOperation({
        ...base,
        compensatedBy: Compensation.None,
        compensationReason: ' ',
      }),
    ).toThrow(/compensationReason/);
    expect(() => defineOperation({ ...base, compensatedBy: base.id })).toThrow(
      /sí misma/,
    );
    expect(() =>
      defineOperation({
        ...base,
        mutating: false,
        compensatedBy: 'x.y',
      } as never),
    ).toThrow(/solo lectura/);
    expect(() =>
      defineOperation({ ...base, mutating: false, timeoutMs: 0 }),
    ).toThrow(/timeoutMs/);
    expect(() =>
      defineOperation({ ...base, mutating: false, id: 'Bad' }),
    ).toThrow(ContractDefinitionError);
  });
});

describe('defineEvent', () => {
  it('takes the version from the type suffix', () => {
    const event = defineEvent({
      type: 'sample.item.created.v2',
      payload: ItemRequest,
      description: 'Se creó un ítem.',
    });
    expect(event.version).toBe(2);
  });

  it.each(['sample.item.created', 'Sample.item.created.v1', 'sample.v1'])(
    'rejects the type %s',
    (type) => {
      expect(() =>
        defineEvent({ type, payload: ItemRequest, description: 'x' }),
      ).toThrow(/tipo/);
    },
  );
});

describe('defineServiceContract', () => {
  enum SampleError {
    Locked = 'SAMPLE.ITEMS.LOCKED',
  }
  const errors = defineErrorCatalog(SampleError, {
    [SampleError.Locked]: {
      httpStatus: 409,
      retryable: false,
      audience: ErrorAudience.Public,
      description: 'Bloqueado.',
    },
  });
  const route = defineRoute({
    id: 'sample.items.list',
    method: HttpMethod.Get,
    path: '/v1/items',
    access: Access.public(),
    description: 'Lista.',
  });

  it('fills missing maps and freezes the contract', () => {
    const contract = defineServiceContract({
      service: 'sample',
      description: 'Ejemplo.',
      enums: { SampleError },
      errors: { SampleError: errors },
      routes: { listItems: route },
    });
    expect(contract.schemas).toEqual({});
    expect(Object.isFrozen(contract)).toBe(true);
  });

  it('rejects invalid names, repeated ids and incomplete catalogs', () => {
    expect(() =>
      defineServiceContract({ service: 'Sample', description: 'x' }),
    ).toThrow(/Servicio inválido/);
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        schemas: { badName: EmptySchema },
      }),
    ).toThrow(/esquema/);
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        routes: { a: route, b: route },
      }),
    ).toThrow(/repetido/);
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        errors: { SampleError: errors },
      }),
    ).toThrow(/no tiene enum/);
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        enums: { SampleError },
        errors: { SampleError: [] },
      }),
    ).toThrow(/no coincide/);
  });
});
