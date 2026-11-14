import type { z } from 'zod';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import type { CommandDefinition } from './define-command.js';
import type { EventDefinition } from './define-event.js';
import type { QueueDefinition, TopicDefinition } from './define-messaging.js';
import type { OperationDefinition } from './define-operation.js';
import type { RouteDefinition } from './define-route.js';
import { ServiceContractValidator } from './service-contract-validator.js';

/** Valor permitido en una constante exportada. */
export type ConstantValue =
  string | number | boolean | readonly (string | number | boolean)[];

/** Enum de TypeScript con valores de texto. */
export type StringEnum = Readonly<Record<string, string>>;

/**
 * Todo lo que un servicio expone: es la entrada de `contracts-export`.
 * Las claves de cada mapa son los nombres públicos (tipos en PascalCase,
 * rutas, operaciones, eventos, comandos, tópicos y colas en camelCase).
 */
export interface ServiceContract {
  /** Nombre del servicio en minúsculas, igual a la carpeta de `libs/contracts`. */
  readonly service: string;
  readonly description: string;
  readonly enums: Readonly<Record<string, StringEnum>>;
  readonly constants: Readonly<
    Record<string, Readonly<Record<string, ConstantValue>>>
  >;
  /** Esquemas con nombre. Toda ruta, operación y mensaje usa esquemas de aquí o de otro contrato. */
  readonly schemas: Readonly<Record<string, z.ZodType>>;
  readonly routes: Readonly<Record<string, RouteDefinition>>;
  readonly operations: Readonly<Record<string, OperationDefinition>>;
  /** Eventos que publica el servicio. Cada uno va en uno de sus `topics`. */
  readonly events: Readonly<Record<string, EventDefinition>>;
  /** Comandos que atiende el servicio. Cada uno llega a una de sus `queues`. */
  readonly commands: Readonly<Record<string, CommandDefinition>>;
  /** Tópicos del servicio, con los eventos que publica en cada uno. */
  readonly topics: Readonly<Record<string, TopicDefinition>>;
  /** Colas que consume el servicio: sus comandos y sus suscripciones. */
  readonly queues: Readonly<Record<string, QueueDefinition>>;
  /** Comandos de otros servicios (o propios) que este servicio envía. */
  readonly sends: readonly CommandDefinition[];
  /** Catálogo de cada enum de códigos de error, por nombre del enum. */
  readonly errors: Readonly<Record<string, readonly ErrorCatalogEntry[]>>;
}

export type ServiceContractSpec = Partial<
  Omit<ServiceContract, 'service' | 'description'>
> &
  Pick<ServiceContract, 'service' | 'description'>;

const validator = new ServiceContractValidator();

/**
 * Reúne el contrato de un servicio y lo valida con `ServiceContractValidator`.
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
