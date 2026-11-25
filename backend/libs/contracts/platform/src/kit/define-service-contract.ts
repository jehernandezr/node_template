import type { z } from 'zod';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import type { CommandDefinition } from './define-command.js';
import type { EventDefinition } from './define-event.js';
import type { QueueDefinition, TopicDefinition } from './define-messaging.js';
import type { OperationDefinition } from './define-operation.js';
import type { RouteDefinition } from './define-route.js';
import { ServiceContractValidator } from './service-contract-validator.js';

/** Value allowed in an exported constant. */
export type ConstantValue =
  string | number | boolean | readonly (string | number | boolean)[];

/** TypeScript enum with string values. */
export type StringEnum = Readonly<Record<string, string>>;

/**
 * Everything a service exposes: it is the input of `contracts-export`.
 * The keys of each map are the public names (types in PascalCase,
 * routes, operations, events, commands, topics and queues in camelCase).
 */
export interface ServiceContract {
  /** Service name in lowercase, same as the folder in `libs/contracts`. */
  readonly service: string;
  readonly description: string;
  readonly enums: Readonly<Record<string, StringEnum>>;
  readonly constants: Readonly<
    Record<string, Readonly<Record<string, ConstantValue>>>
  >;
  /** Named schemas. Every route, operation and message uses schemas from here or from another contract. */
  readonly schemas: Readonly<Record<string, z.ZodType>>;
  readonly routes: Readonly<Record<string, RouteDefinition>>;
  readonly operations: Readonly<Record<string, OperationDefinition>>;
  /** Events the service publishes. Each one goes in one of its `topics`. */
  readonly events: Readonly<Record<string, EventDefinition>>;
  /** Commands the service handles. Each one arrives at one of its `queues`. */
  readonly commands: Readonly<Record<string, CommandDefinition>>;
  /** Topics of the service, with the events it publishes on each one. */
  readonly topics: Readonly<Record<string, TopicDefinition>>;
  /** Queues the service consumes: its commands and its subscriptions. */
  readonly queues: Readonly<Record<string, QueueDefinition>>;
  /** Commands of other services (or its own) that this service sends. */
  readonly sends: readonly CommandDefinition[];
  /** Catalog of each error code enum, by enum name. */
  readonly errors: Readonly<Record<string, readonly ErrorCatalogEntry[]>>;
}

export type ServiceContractSpec = Partial<
  Omit<ServiceContract, 'service' | 'description'>
> &
  Pick<ServiceContract, 'service' | 'description'>;

const validator = new ServiceContractValidator();

/**
 * Assembles a service's contract and validates it with `ServiceContractValidator`.
 */
export function defineServiceContract(
  spec: ServiceContractSpec,
): ServiceContract {
  const contract: ServiceContract = {
    service: spec.service,
    description: spec.description,
    enums: spec.enums ?? {},
    constants: spec.constants ?? {},
    schemas: spec.schemas ?? {},
    routes: spec.routes ?? {},
    operations: spec.operations ?? {},
    events: spec.events ?? {},
    commands: spec.commands ?? {},
    topics: spec.topics ?? {},
    queues: spec.queues ?? {},
    sends: Object.freeze([...(spec.sends ?? [])]),
    errors: spec.errors ?? {},
  };
  validator.validate(contract);
  return Object.freeze(contract);
}
