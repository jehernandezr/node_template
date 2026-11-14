import { z } from 'zod';
import { AccessKind } from '../enums/access-kind.enum.js';
import { Compensation } from '../enums/compensation.enum.js';
import { ErrorAudience } from '../enums/error-audience.enum.js';
import { HttpMethod } from '../enums/http-method.enum.js';
import { EmptySchema } from '../schemas/empty.schema.js';
import { IdSchema } from '../schemas/id.schema.js';
import { Access } from './access.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import { MessageKind } from '../enums/message-kind.enum.js';
import { QueryValueKind } from '../enums/query-value-kind.enum.js';
import { defineCommand } from './define-command.js';
import { defineEvent } from './define-event.js';
import {
  defineQueue,
  defineTopic,
  deliveredTypes,
} from './define-messaging.js';
import { defineOperation } from './define-operation.js';
import { defineRoute, usesQuery } from './define-route.js';
import { defineServiceContract } from './define-service-contract.js';
import { defineErrorCatalog } from './error-catalog.js';
import { decodeQuery } from './query-params.js';

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
    expect(route.version).toBe(1);
    expect(route.queryParams).toEqual([]);
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
    [{ path: '/items/{itemId}' }, /empieza con \/vN\//],
    [{ path: '/v0/items/{itemId}' }, /path inválido/],
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

  it('describes query fields and takes the major version from the path', () => {
    const route = defineRoute({
      id: 'sample.items.search',
      method: HttpMethod.Get,
      path: '/v2/items/{itemId}',
      request: z.strictObject({
        itemId: IdSchema,
        limit: z.int().min(1).optional(),
        archived: z.boolean().default(false),
        status: z.enum(['open', 'closed']).optional(),
        tags: z.array(z.string()).optional(),
      }),
      access: Access.public(),
      description: 'Busca.',
    });
    expect(route.version).toBe(2);
    expect(route.queryParams).toEqual([
      { name: 'limit', kind: QueryValueKind.Number, list: false },
      { name: 'archived', kind: QueryValueKind.Boolean, list: false },
      { name: 'status', kind: QueryValueKind.String, list: false },
      { name: 'tags', kind: QueryValueKind.String, list: true },
    ]);
  });

  it.each([
    [z.object({ a: z.string() }), /escalar/],
    [z.array(z.object({ a: z.string() })), /escalar/],
    [z.string().nullable(), /null/],
    [z.union([z.string(), z.number()]), /escalar/],
  ])('rejects the query field %#', (field, message) => {
    expect(() =>
      defineRoute({
        id: 'sample.items.list',
        method: HttpMethod.Get,
        path: '/v1/items',
        request: z.strictObject({ field }),
        access: Access.public(),
        description: 'Lista.',
      }),
    ).toThrow(message);
  });

  it('accepts any body in POST routes', () => {
    const route = defineRoute({
      id: 'sample.items.create',
      method: HttpMethod.Post,
      path: '/v1/items',
      request: z.strictObject({ nested: z.object({ a: z.string() }) }),
      access: Access.public(),
      description: 'Crea.',
    });
    expect(route.queryParams).toEqual([]);
  });

  it('declares and checks a deprecation', () => {
    const base = {
      id: 'sample.items.legacy',
      method: HttpMethod.Get,
      path: '/v1/legacy',
      access: Access.public(),
      description: 'Ruta vieja.',
    };
    expect(
      defineRoute({
        ...base,
        deprecated: {
          since: '2026-11-01',
          sunset: '2027-05-01',
          replacement: 'sample.items.list',
        },
      }).deprecated,
    ).toEqual({
      since: '2026-11-01',
      sunset: '2027-05-01',
      replacement: 'sample.items.list',
    });
    expect(() =>
      defineRoute({
        ...base,
        deprecated: { since: '2026-13-01', sunset: '2027-05-01' },
      }),
    ).toThrow(/fechas/);
    expect(() =>
      defineRoute({
        ...base,
        deprecated: { since: '2027-05-01', sunset: '2027-05-01' },
      }),
    ).toThrow(/posterior/);
  });
});

describe('decodeQuery', () => {
  const route = defineRoute({
    id: 'sample.items.search',
    method: HttpMethod.Get,
    path: '/v1/items',
    request: z.strictObject({
      limit: z.int().min(1).max(100).optional(),
      archived: z.boolean().optional(),
      ratio: z.number().optional(),
      tags: z.array(z.string()).optional(),
      sizes: z.array(z.int()).optional(),
      name: z.string().optional(),
    }),
    access: Access.public(),
    description: 'Busca.',
  });

  it('converts the query text to the contract types', () => {
    const decoded = decodeQuery(route, {
      limit: '20',
      archived: 'false',
      ratio: '-1.5e2',
      tags: 'a',
      sizes: ['1', '2'],
      name: '42',
      ignored: undefined,
    });
    expect(decoded).toEqual({
      limit: 20,
      archived: false,
      ratio: -150,
      tags: ['a'],
      sizes: [1, 2],
      name: '42',
    });
    expect(route.request.safeParse(decoded).success).toBe(true);
  });

  it('keeps what it cannot convert so validation reports the field', () => {
    const decoded = decodeQuery(route, {
      limit: '2x',
      archived: 'yes',
      name: ['a', 'b'],
      extra: '1',
    });
    expect(decoded).toEqual({
      limit: '2x',
      archived: 'yes',
      name: ['a', 'b'],
      extra: '1',
    });
    expect(route.request.safeParse(decoded).success).toBe(false);
  });
});

describe('defineOperation', () => {
  const base = {
    id: 'sample.items.create.v1',
    input: ItemRequest,
    output: z.object({ ok: z.boolean() }),
    idempotent: true,
    description: 'Crea un ítem.',
  };

  it('accepts a compensated mutating operation with OperationOptions fields', () => {
    const op = defineOperation({
      ...base,
      compensatedBy: 'sample.items.delete.v1',
      errors: ['SAMPLE.ITEMS.LOCKED'],
      timeoutMs: 1000,
      retry: { maxAttempts: 2, baseMs: 10, maxMs: 100 },
    });
    expect(op).toMatchObject({
      id: 'sample.items.create.v1',
      version: 1,
      mutating: true,
      idempotent: true,
      compensatedBy: 'sample.items.delete.v1',
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

  it.each(['sample.items.create', 'sample.v1', 'sample.items.create.v0'])(
    'requires a versioned id, not %s',
    (id) => {
      expect(() => defineOperation({ ...base, mutating: false, id })).toThrow(
        /\.vN/,
      );
    },
  );

  it('takes the version from the id suffix', () => {
    expect(
      defineOperation({ ...base, mutating: false, id: 'sample.items.get.v3' })
        .version,
    ).toBe(3);
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
    expect(event.kind).toBe(MessageKind.Event);
    expect(event.schema).toBe(ItemRequest);
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

describe('defineCommand', () => {
  it('declares a versioned command with the messaging shape', () => {
    const command = defineCommand({
      type: 'sample.report.generate.v1',
      payload: ItemRequest,
      description: 'Genera un reporte.',
    });
    expect(command).toMatchObject({
      type: 'sample.report.generate.v1',
      kind: MessageKind.Command,
      version: 1,
      payload: ItemRequest,
      schema: ItemRequest,
    });
    expect(Object.isFrozen(command)).toBe(true);
  });

  it.each(['sample.report.generate', 'sample.generate.v1'])(
    'rejects the type %s',
    (type) => {
      expect(() =>
        defineCommand({ type, payload: ItemRequest, description: 'x' }),
      ).toThrow(/servicio\.entidad\.verbo\.vN/);
    },
  );
});

describe('defineTopic and defineQueue', () => {
  const created = defineEvent({
    type: 'sample.item.created.v1',
    payload: ItemRequest,
    description: 'Se creó.',
  });
  const deleted = defineEvent({
    type: 'sample.item.deleted.v1',
    payload: ItemRequest,
    description: 'Se borró.',
  });
  const generate = defineCommand({
    type: 'sample.report.generate.v1',
    payload: ItemRequest,
    description: 'Genera.',
  });
  const topic = defineTopic({
    name: 'sample-events',
    events: [created, deleted],
    description: 'Eventos.',
  });

  it('fills the queue defaults and lists the delivered types', () => {
    const queue = defineQueue({
      name: 'sample-work',
      commands: [generate],
      subscriptions: [
        { topic },
        { topic: { ...topic, name: 'other-events' }, events: [created] },
      ],
      description: 'Trabajo.',
    });
    expect(queue).toMatchObject({
      fifo: false,
      visibilityTimeoutSeconds: 30,
      retry: { maxAttempts: 5, baseMs: 1000, maxMs: 300000 },
      deadLetter: { maxReceiveCount: 5, retentionDays: 14 },
    });
    expect(deliveredTypes(queue)).toEqual([
      'sample.report.generate.v1',
      'sample.item.created.v1',
      'sample.item.deleted.v1',
      'sample.item.created.v1',
    ]);
  });

  it.each([
    [{ name: 'Bad_Name' }, /nombre inválido/],
    [{ name: 'sample-work-dlq' }, /nombre inválido/],
    [{ visibilityTimeoutSeconds: 0 }, /visibilityTimeoutSeconds/],
    [{ retry: { maxAttempts: 0, baseMs: 1, maxMs: 1 } }, /retry/],
    [{ deadLetter: { maxReceiveCount: 2 } }, /maxReceiveCount/],
    [{ deadLetter: { retentionDays: 15 } }, /retentionDays/],
    [{ commands: [] }, /no recibe/],
    [{ commands: [generate, generate] }, /repetidos/],
    [
      { subscriptions: [{ topic: { ...topic, fifo: true } }] },
      /solo entrega a colas FIFO/,
    ],
    [{ subscriptions: [{ topic }, { topic }] }, /suscripción repetida/],
  ])('rejects the queue %j', (override, message) => {
    expect(() =>
      defineQueue({
        name: 'sample-work',
        commands: [generate],
        description: 'Trabajo.',
        ...override,
      }),
    ).toThrow(message);
  });

  it('rejects a subscription to an event the topic does not publish', () => {
    expect(() =>
      defineQueue({
        name: 'sample-work',
        subscriptions: [
          {
            topic: defineTopic({ ...topic, events: [deleted] }),
            events: [created],
          },
        ],
        description: 'Trabajo.',
      }),
    ).toThrow(/no se publica/);
  });

  it('rejects empty or repeated topics', () => {
    expect(() =>
      defineTopic({ name: 'sample-events', events: [], description: 'x' }),
    ).toThrow(/no tiene eventos/);
    expect(() =>
      defineTopic({
        name: 'sample-events',
        events: [created, created],
        description: 'x',
      }),
    ).toThrow(/repetidos/);
  });
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
    expect(contract.commands).toEqual({});
    expect(contract.sends).toEqual([]);
    expect(Object.isFrozen(contract)).toBe(true);
  });

  describe('compensations', () => {
    const op = (id: string, extra: object) =>
      defineOperation({
        id,
        input: ItemRequest,
        output: EmptySchema,
        idempotent: true,
        description: 'Op.',
        ...extra,
      } as never);
    const reserve = op('sample.credits.reserve.v1', {
      compensatedBy: 'sample.credits.release.v1',
    });
    const contractWith = (release: object | null) =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        operations: release
          ? { reserve, release: op('sample.credits.release.v1', release) }
          : { reserve },
      });

    it('accepts a reverse that mutates and is idempotent', () => {
      expect(() =>
        contractWith({
          compensatedBy: Compensation.None,
          compensationReason: 'Es la reversa.',
        }),
      ).not.toThrow();
    });

    it('rejects a missing reverse', () => {
      expect(() => contractWith(null)).toThrow(/no está en el contrato/);
    });

    it('rejects a read-only reverse', () => {
      expect(() => contractWith({ mutating: false })).toThrow(/solo lectura/);
    });

    it('rejects a reverse that is not idempotent', () => {
      expect(() =>
        contractWith({
          idempotent: false,
          compensatedBy: Compensation.None,
          compensationReason: 'Es la reversa.',
        }),
      ).toThrow(/no es idempotente/);
    });
  });

  it('requires ids, types, names and codes of the own service', () => {
    const foreignRoute = defineRoute({
      id: 'other.items.list',
      method: HttpMethod.Get,
      path: '/v1/other',
      access: Access.public(),
      description: 'x',
    });
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        routes: { list: foreignRoute },
      }),
    ).toThrow(/no pertenece al servicio/);
    enum OtherError {
      Locked = 'OTHER.ITEMS.LOCKED',
    }
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        enums: { OtherError },
        errors: {
          OtherError: defineErrorCatalog(OtherError, {
            [OtherError.Locked]: {
              httpStatus: 409,
              retryable: false,
              audience: ErrorAudience.Public,
              description: 'x',
            },
          }),
        },
      }),
    ).toThrow(/SAMPLE\./);
    const foreign = defineEvent({
      type: 'other.item.created.v1',
      payload: ItemRequest,
      description: 'x',
    });
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        events: { foreign },
        topics: {
          events: defineTopic({
            name: 'sample-events',
            events: [foreign],
            description: 'x',
          }),
        },
      }),
    ).toThrow(/no pertenece al servicio/);
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        operations: {
          get: defineOperation({
            id: 'other.items.get.v1',
            input: ItemRequest,
            output: EmptySchema,
            idempotent: true,
            mutating: false,
            description: 'x',
          }),
        },
      }),
    ).toThrow(/no pertenece al servicio/);
  });

  describe('messaging', () => {
    const created = defineEvent({
      type: 'sample.item.created.v1',
      payload: ItemRequest,
      description: 'x',
    });
    const generate = defineCommand({
      type: 'sample.report.generate.v1',
      payload: ItemRequest,
      description: 'x',
    });
    const topic = defineTopic({
      name: 'sample-events',
      events: [created],
      description: 'x',
    });
    const queue = defineQueue({
      name: 'sample-commands',
      commands: [generate],
      description: 'x',
    });

    it('accepts every event in a topic and every command in a queue', () => {
      const contract = defineServiceContract({
        service: 'sample',
        description: 'x',
        events: { created },
        commands: { generate },
        topics: { events: topic },
        queues: { commands: queue },
        sends: [generate],
      });
      expect(contract.sends).toEqual([generate]);
    });

    it('rejects an event without topic and a command without queue', () => {
      expect(() =>
        defineServiceContract({
          service: 'sample',
          description: 'x',
          events: { created },
        }),
      ).toThrow(/no tiene tópico/);
      expect(() =>
        defineServiceContract({
          service: 'sample',
          description: 'x',
          commands: { generate },
        }),
      ).toThrow(/no tiene cola/);
    });

    it('rejects a message placed twice or not declared', () => {
      expect(() =>
        defineServiceContract({
          service: 'sample',
          description: 'x',
          events: { created },
          topics: {
            a: topic,
            b: defineTopic({
              name: 'sample-more',
              events: [created],
              description: 'x',
            }),
          },
        }),
      ).toThrow(/está en/);
      expect(() =>
        defineServiceContract({
          service: 'sample',
          description: 'x',
          topics: { events: topic },
        }),
      ).toThrow(/no es un evento del contrato/);
    });

    it('rejects a queue or topic of another service', () => {
      expect(() =>
        defineServiceContract({
          service: 'sample',
          description: 'x',
          commands: { generate },
          queues: {
            commands: defineQueue({
              name: 'other-commands',
              commands: [generate],
              description: 'x',
            }),
          },
        }),
      ).toThrow(/sample-/);
    });
  });

  it('rejects a replacement route that does not exist', () => {
    const legacy = defineRoute({
      id: 'sample.items.legacy',
      method: HttpMethod.Get,
      path: '/v1/legacy',
      access: Access.public(),
      deprecated: {
        since: '2026-11-01',
        sunset: '2027-01-01',
        replacement: 'sample.items.missing',
      },
      description: 'x',
    });
    expect(() =>
      defineServiceContract({
        service: 'sample',
        description: 'x',
        routes: { legacy },
      }),
    ).toThrow(/se reemplaza/);
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
