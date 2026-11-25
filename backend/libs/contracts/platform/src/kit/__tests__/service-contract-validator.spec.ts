import { z } from 'zod';
import { Compensation } from '../../enums/compensation.enum.js';
import { ErrorAudience } from '../../enums/error-audience.enum.js';
import { HttpMethod } from '../../enums/http-method.enum.js';
import { Access } from '../access.js';
import { ContractDefinitionError } from '../contract-definition-error.js';
import { defineCommand } from '../define-command.js';
import { defineEvent } from '../define-event.js';
import { defineQueue, defineTopic } from '../define-messaging.js';
import { defineOperation } from '../define-operation.js';
import { defineRoute } from '../define-route.js';
import type { ServiceContract } from '../define-service-contract.js';
import { defineErrorCatalog } from '../error-catalog.js';
import { ServiceContractValidator } from '../service-contract-validator.js';

enum DemoError {
  Locked = 'DEMO.ITEMS.LOCKED',
}

enum OtherError {
  Locked = 'OTHER.ITEMS.LOCKED',
}

const Item = z.strictObject({ itemId: z.string() });

const getItem = defineRoute({
  id: 'demo.items.get',
  method: HttpMethod.Get,
  path: '/v1/items/{itemId}',
  request: Item,
  access: Access.public(),
  description: 'Lee un ítem.',
});

const fetchItem = defineRoute({
  id: 'demo.items.fetch',
  method: HttpMethod.Get,
  path: '/v1/items/{itemId}',
  request: Item,
  access: Access.public(),
  description: 'Lee un ítem otra vez.',
});

const created = defineEvent({
  type: 'demo.item.created.v1',
  payload: Item,
  description: 'Se creó un ítem.',
});

const generate = defineCommand({
  type: 'demo.report.generate.v1',
  payload: Item,
  description: 'Genera un reporte.',
});

const topic = defineTopic({
  name: 'demo-events',
  events: [created],
  description: 'Eventos del servicio.',
});

const queue = defineQueue({
  name: 'demo-commands',
  commands: [generate],
  description: 'Comandos del servicio.',
});

const errorCatalog = defineErrorCatalog(DemoError, {
  [DemoError.Locked]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'Bloqueado.',
  },
});

const otherCatalog = defineErrorCatalog(OtherError, {
  [OtherError.Locked]: {
    httpStatus: 409,
    retryable: false,
    audience: ErrorAudience.Public,
    description: 'Bloqueado.',
  },
});

const base: ServiceContract = {
  service: 'demo',
  description: 'Demo.',
  enums: {},
  constants: {},
  schemas: {},
  routes: {},
  operations: {},
  events: {},
  commands: {},
  topics: {},
  queues: {},
  sends: [],
  errors: {},
};

const validator = new ServiceContractValidator();

const invalidContracts: [string, ServiceContract, string][] = [
  [
    'a service name with uppercase letters',
    { ...base, service: 'Demo' },
    'Invalid service: Demo',
  ],
  [
    'an enum name that is not a type name',
    { ...base, enums: { badEnum: { Locked: 'DEMO.ITEMS.LOCKED' } } },
    'invalid enum name badEnum',
  ],
  [
    'a route id from another service',
    {
      ...base,
      routes: {
        get: defineRoute({
          id: 'other.items.get',
          method: HttpMethod.Get,
          path: '/v1/items/{itemId}',
          request: Item,
          access: Access.public(),
          description: 'Lee un ítem.',
        }),
      },
    },
    'does not belong to the service',
  ],
  [
    'two routes with the same method and path',
    { ...base, routes: { get: getItem, fetch: fetchItem } },
    'duplicate method and path',
  ],
  [
    'two operation keys with the same operation id',
    {
      ...base,
      operations: {
        get: defineOperation({
          id: 'demo.items.get.v1',
          input: Item,
          output: Item,
          idempotent: true,
          mutating: false,
          description: 'Lee.',
        }),
        fetch: defineOperation({
          id: 'demo.items.get.v1',
          input: Item,
          output: Item,
          idempotent: true,
          mutating: false,
          description: 'Lee.',
        }),
      },
    },
    'duplicate operation id',
  ],
  [
    'a deprecated route whose replacement is missing',
    {
      ...base,
      routes: {
        get: defineRoute({
          id: 'demo.items.legacy',
          method: HttpMethod.Get,
          path: '/v1/legacy/{itemId}',
          request: Item,
          access: Access.public(),
          description: 'Ruta vieja.',
          deprecated: {
            since: '2026-11-01',
            sunset: '2027-05-01',
            replacement: 'demo.missing',
          },
        }),
      },
    },
    'which is not in the contract',
  ],
  [
    'an operation compensated by a missing operation',
    {
      ...base,
      operations: {
        create: defineOperation({
          id: 'demo.items.create.v1',
          input: Item,
          output: Item,
          idempotent: true,
          compensatedBy: 'demo.items.remove.v1',
          description: 'Crea.',
        }),
      },
    },
    'which is not in the contract',
  ],
  [
    'a read-only operation as compensation',
    {
      ...base,
      operations: {
        create: defineOperation({
          id: 'demo.items.create.v1',
          input: Item,
          output: Item,
          idempotent: true,
          compensatedBy: 'demo.items.remove.v1',
          description: 'Crea.',
        }),
        remove: defineOperation({
          id: 'demo.items.remove.v1',
          input: Item,
          output: Item,
          idempotent: true,
          mutating: false,
          description: 'Borra.',
        }),
      },
    },
    'is read-only',
  ],
  [
    'a non idempotent operation as compensation',
    {
      ...base,
      operations: {
        create: defineOperation({
          id: 'demo.items.create.v1',
          input: Item,
          output: Item,
          idempotent: true,
          compensatedBy: 'demo.items.remove.v1',
          description: 'Crea.',
        }),
        remove: defineOperation({
          id: 'demo.items.remove.v1',
          input: Item,
          output: Item,
          idempotent: false,
          compensatedBy: Compensation.None,
          compensationReason: 'Es la reversa.',
          description: 'Borra.',
        }),
      },
    },
    'is not idempotent',
  ],
  ['an event without topic', { ...base, events: { created } }, 'has no topic'],
  [
    'a command without queue',
    { ...base, commands: { generate } },
    'has no queue',
  ],
  [
    'an event placed in two topics',
    {
      ...base,
      events: { created },
      topics: {
        events: topic,
        more: defineTopic({
          name: 'demo-more',
          events: [created],
          description: 'Más eventos.',
        }),
      },
    },
    'is in',
  ],
  [
    'an error catalog without enum in enums',
    { ...base, errors: { DemoError: errorCatalog } },
    'has no enum in enums',
  ],
  [
    'an error catalog that does not match its enum',
    {
      ...base,
      enums: {
        DemoError: { Locked: 'DEMO.ITEMS.LOCKED', Gone: 'DEMO.ITEMS.GONE' },
      },
      errors: { DemoError: errorCatalog },
    },
    'does not match its enum',
  ],
  [
    'an error code without the service prefix',
    {
      ...base,
      enums: { OtherError },
      errors: { OtherError: otherCatalog },
    },
    'does not belong to the service',
  ],
];

describe('ServiceContractValidator', () => {
  describe('validate', () => {
    it('accepts a valid contract', () => {
      expect(() => validator.validate(base)).not.toThrow();
    });

    it('accepts every event in a topic and every command in a queue', () => {
      const contract: ServiceContract = {
        ...base,
        events: { created },
        commands: { generate },
        topics: { events: topic },
        queues: { commands: queue },
      };

      expect(() => validator.validate(contract)).not.toThrow();
    });

    it.each(invalidContracts)('rejects %s', (_description, contract, text) => {
      expect(() => validator.validate(contract)).toThrow(text);
    });

    it('throws a ContractDefinitionError for an invalid service name', () => {
      expect(() => validator.validate({ ...base, service: 'Demo' })).toThrow(
        ContractDefinitionError,
      );
    });
  });

  describe('errorCodePrefixOf', () => {
    it.each([
      ['identity', 'IDENTITY.'],
      ['my-service', 'MY_SERVICE.'],
    ])('builds the code prefix of %s as %s', (service, prefix) => {
      expect(validator.errorCodePrefixOf(service)).toBe(prefix);
    });
  });
});
