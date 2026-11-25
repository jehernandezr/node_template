import { BillingErrorCode } from '@contracts/billing';
import { IdentityErrorCode } from '@contracts/identity';
import {
  Compensation,
  messageKeyFor,
  platformContract,
  PlatformErrorCode,
} from '@contracts/platform';
import { z } from 'zod';
import { tasksContract } from '../contract.js';
import {
  TasksErrorCode,
  TasksEvent,
  TasksOperation,
  TasksRoute,
} from '../enums/identifiers.enum.js';
import { tasksErrorCatalog } from '../errors/tasks-error-catalog.js';

const routes = Object.values(tasksContract.routes);
const operations = Object.values(tasksContract.operations);
const events = Object.values(tasksContract.events);
const commands = Object.values(tasksContract.commands);

/** Schemas that a route, operation or message may use: those of this contract and those of platform. */
const registered = new Set<z.ZodType>([
  ...Object.values(tasksContract.schemas),
  ...Object.values(platformContract.schemas),
]);

const knownErrorCodes = new Set<string>([
  ...Object.values(PlatformErrorCode),
  ...Object.values(IdentityErrorCode),
  ...Object.values(TasksErrorCode),
  BillingErrorCode.QuotaExceeded,
]);

describe('tasksContract', () => {
  it('declares every TasksRoute value exactly once', () => {
    expect(routes.map((route) => route.id).sort()).toEqual(
      Object.values(TasksRoute).sort(),
    );
  });

  it('declares every TasksOperation value exactly once', () => {
    expect(operations.map((op) => op.id).sort()).toEqual(
      Object.values(TasksOperation).sort(),
    );
  });

  it('declares every TasksEvent value exactly once', () => {
    expect(events.map((event) => event.type).sort()).toEqual(
      Object.values(TasksEvent).sort(),
    );
  });

  it.each(routes.map((route) => [route.id, route] as const))(
    'registers the request and the response of %s',
    (_id, route) => {
      expect(registered.has(route.request)).toBe(true);
      if (route.response) expect(registered.has(route.response)).toBe(true);
    },
  );

  it.each(operations.map((op) => [op.id, op] as const))(
    'registers the input and the output of %s',
    (_id, op) => {
      expect(registered.has(op.input)).toBe(true);
      expect(registered.has(op.output)).toBe(true);
    },
  );

  it.each(
    [...events, ...commands].map((message) => [message.type, message] as const),
  )('registers the payload of %s', (_type, message) => {
    expect(registered.has(message.payload)).toBe(true);
  });

  it.each([...routes, ...operations].map((item) => [item.id, item] as const))(
    'declares only known error codes in %s',
    (_id, item) => {
      for (const code of item.errors) {
        expect(knownErrorCodes.has(code)).toBe(true);
      }
    },
  );

  it.each(
    operations.filter((op) => op.mutating).map((op) => [op.id, op] as const),
  )('declares the compensation of %s', (_id, op) => {
    expect(op.compensatedBy).toBeDefined();
    if (op.compensatedBy === Compensation.None) {
      expect(op.compensationReason?.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(
    Object.entries(tasksContract.schemas).map(
      ([name, schema]) => [name, schema] as const,
    ),
  )('converts the schema %s to JSON Schema', (_name, schema) => {
    expect(() =>
      z.toJSONSchema(schema, {
        target: 'draft-2020-12',
        io: 'input',
        unrepresentable: 'throw',
      }),
    ).not.toThrow();
  });
});

describe('tasksErrorCatalog', () => {
  it('has one entry per code', () => {
    expect(tasksErrorCatalog.map((entry) => entry.code).sort()).toEqual(
      Object.values(TasksErrorCode).sort(),
    );
  });

  it.each(tasksErrorCatalog.map((entry) => [entry.code, entry] as const))(
    'uses the message key and the TASKS prefix: %s',
    (_code, entry) => {
      expect(entry.messageKey).toBe(messageKeyFor(entry.code));
      expect(entry.code.startsWith('TASKS.')).toBe(true);
    },
  );
});
