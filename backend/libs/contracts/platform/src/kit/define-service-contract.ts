import type { z } from 'zod';
import { Compensation } from '../enums/compensation.enum.js';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import type { CommandDefinition } from './define-command.js';
import type { EventDefinition } from './define-event.js';
import type { QueueDefinition, TopicDefinition } from './define-messaging.js';
import type { OperationDefinition } from './define-operation.js';
import type { RouteDefinition } from './define-route.js';

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

const SERVICE = /^[a-z][a-z0-9-]*$/;
const TYPE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const MEMBER_NAME = /^[a-z][A-Za-z0-9]*$/;

/** Prefijo de los códigos de error de un servicio: `IDENTITY.` para `identity`. */
export function errorCodePrefixOf(service: string): string {
  return `${service.toUpperCase().replace(/-/g, '_')}.`;
}

function checkNames(
  service: string,
  kind: string,
  names: readonly string[],
  pattern: RegExp,
): void {
  for (const name of names) {
    if (!pattern.test(name)) {
      throw new ContractDefinitionError(
        `Contrato ${service}: nombre de ${kind} inválido ${name}`,
      );
    }
  }
}

function checkUnique(service: string, kind: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      throw new ContractDefinitionError(
        `Contrato ${service}: ${kind} repetido ${id}`,
      );
    }
    seen.add(id);
  }
}

function checkPrefix(
  service: string,
  kind: string,
  ids: readonly string[],
  prefix: string,
): void {
  for (const id of ids) {
    if (!id.startsWith(prefix)) {
      throw new ContractDefinitionError(
        `Contrato ${service}: ${kind} ${id} no pertenece al servicio (se espera el prefijo ${prefix})`,
      );
    }
  }
}

function fail(service: string, reason: string): never {
  throw new ContractDefinitionError(`Contrato ${service}: ${reason}`);
}

/**
 * Comprueba la reversa de cada operación: `compensatedBy` es `Compensation.None`
 * o el id de otra operación del mismo contrato que modifica datos y es
 * idempotente, porque una saga puede repetirla.
 */
function checkCompensations(contract: ServiceContract): void {
  const byId = new Map(
    Object.values(contract.operations).map((op) => [op.id, op]),
  );
  for (const op of byId.values()) {
    const target = op.compensatedBy;
    if (target === undefined || target === Compensation.None) continue;
    const reverse = byId.get(target);
    if (!reverse) {
      fail(
        contract.service,
        `la operación ${op.id} se compensa con ${target}, que no está en el contrato`,
      );
    }
    if (!reverse.mutating) {
      fail(
        contract.service,
        `la reversa ${target} de ${op.id} es de solo lectura`,
      );
    }
    if (!reverse.idempotent) {
      fail(
        contract.service,
        `la reversa ${target} de ${op.id} no es idempotente`,
      );
    }
  }
}

/** Cada mensaje propio va en exactamente un tópico o una cola propia. */
function checkPlacement<M extends { readonly type: string }>(
  service: string,
  kind: string,
  owned: readonly M[],
  containers: readonly {
    readonly name: string;
    readonly items: readonly M[];
  }[],
): void {
  const ownedTypes = new Map(owned.map((m) => [m.type, m]));
  const placed = new Map<string, string>();
  for (const container of containers) {
    for (const item of container.items) {
      if (ownedTypes.get(item.type) !== item) {
        fail(
          service,
          `${container.name} lleva ${item.type}, que no es un ${kind} del contrato`,
        );
      }
      const previous = placed.get(item.type);
      if (previous !== undefined) {
        fail(
          service,
          `${item.type} está en ${previous} y en ${container.name}`,
        );
      }
      placed.set(item.type, container.name);
    }
  }
  for (const type of ownedTypes.keys()) {
    if (!placed.has(type)) {
      fail(
        service,
        `el ${kind} ${type} no tiene ${kind === 'evento' ? 'tópico' : 'cola'}`,
      );
    }
  }
}

function checkMessaging(contract: ServiceContract): void {
  const { service } = contract;
  const topics = Object.values(contract.topics);
  const queues = Object.values(contract.queues);
  checkPlacement(
    service,
    'evento',
    Object.values(contract.events),
    topics.map((t) => ({ name: `el tópico ${t.name}`, items: t.events })),
  );
  checkPlacement(
    service,
    'comando',
    Object.values(contract.commands),
    queues.map((q) => ({ name: `la cola ${q.name}`, items: q.commands })),
  );
  checkUnique(
    service,
    'nombre de tópico o cola',
    [...topics, ...queues].map((x) => x.name),
  );
  checkUnique(
    service,
    'comando enviado',
    contract.sends.map((c) => c.type),
  );
}

/**
 * Reúne el contrato de un servicio y valida su coherencia local: nombres,
 * identificadores únicos y del propio servicio, un catálogo completo por cada
 * enum de errores, la reversa de cada operación y la ubicación de cada evento y
 * comando en un tópico o una cola del servicio.
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
  const { service } = contract;
  if (!SERVICE.test(service)) {
    throw new ContractDefinitionError(`Servicio inválido: ${service}`);
  }
  checkNames(service, 'enum', Object.keys(contract.enums), TYPE_NAME);
  checkNames(service, 'constante', Object.keys(contract.constants), TYPE_NAME);
  checkNames(service, 'esquema', Object.keys(contract.schemas), TYPE_NAME);
  checkNames(service, 'ruta', Object.keys(contract.routes), MEMBER_NAME);
  checkNames(
    service,
    'operación',
    Object.keys(contract.operations),
    MEMBER_NAME,
  );
  checkNames(service, 'evento', Object.keys(contract.events), MEMBER_NAME);
  checkNames(service, 'comando', Object.keys(contract.commands), MEMBER_NAME);
  checkNames(service, 'tópico', Object.keys(contract.topics), MEMBER_NAME);
  checkNames(service, 'cola', Object.keys(contract.queues), MEMBER_NAME);

  const routes = Object.values(contract.routes);
  const operationIds = Object.values(contract.operations).map((o) => o.id);
  const eventTypes = Object.values(contract.events).map((e) => e.type);
  const commandTypes = Object.values(contract.commands).map((c) => c.type);
  checkUnique(
    service,
    'id de ruta',
    routes.map((r) => r.id),
  );
  checkUnique(
    service,
    'método y path',
    routes.map((r) => `${r.method} ${r.path}`),
  );
  checkUnique(service, 'id de operación', operationIds);
  checkUnique(service, 'tipo de mensaje', [...eventTypes, ...commandTypes]);

  const idPrefix = `${service}.`;
  checkPrefix(
    service,
    'la ruta',
    routes.map((r) => r.id),
    idPrefix,
  );
  checkPrefix(service, 'la operación', operationIds, idPrefix);
  checkPrefix(service, 'el evento', eventTypes, idPrefix);
  checkPrefix(service, 'el comando', commandTypes, idPrefix);
  checkPrefix(
    service,
    'el tópico o la cola',
    [...Object.values(contract.topics), ...Object.values(contract.queues)].map(
      (x) => x.name,
    ),
    `${service}-`,
  );

  const routeIds = new Set(routes.map((r) => r.id));
  for (const route of routes) {
    const replacement = route.deprecated?.replacement;
    if (replacement !== undefined && !routeIds.has(replacement)) {
      fail(
        service,
        `la ruta ${route.id} se reemplaza con ${replacement}, que no está en el contrato`,
      );
    }
  }

  checkCompensations(contract);
  checkMessaging(contract);

  const codePrefix = errorCodePrefixOf(service);
  for (const [enumName, entries] of Object.entries(contract.errors)) {
    const values = contract.enums[enumName];
    if (!values) {
      fail(service, `el catálogo ${enumName} no tiene enum en enums`);
    }
    const codes = entries.map((e) => e.code).sort();
    const expected = Object.values(values).sort();
    if (codes.join() !== expected.join()) {
      fail(service, `el catálogo ${enumName} no coincide con su enum`);
    }
    checkPrefix(service, 'el código de error', codes, codePrefix);
  }
  return Object.freeze(contract);
}
