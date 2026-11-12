import type { z } from 'zod';
import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import type { RouteDefinition } from './define-route.js';
import type { OperationDefinition } from './define-operation.js';
import type { EventDefinition } from './define-event.js';

/** Valor permitido en una constante exportada. */
export type ConstantValue =
  string | number | boolean | readonly (string | number | boolean)[];

/** Enum de TypeScript con valores de texto. */
export type StringEnum = Readonly<Record<string, string>>;

/**
 * Todo lo que un servicio expone: es la entrada de `contracts-export`.
 * Las claves de cada mapa son los nombres públicos (tipos en PascalCase,
 * rutas, operaciones y eventos en camelCase).
 */
export interface ServiceContract {
  /** Nombre del servicio en minúsculas, igual a la carpeta de `libs/contracts`. */
  readonly service: string;
  readonly description: string;
  readonly enums: Readonly<Record<string, StringEnum>>;
  readonly constants: Readonly<
    Record<string, Readonly<Record<string, ConstantValue>>>
  >;
  /** Esquemas con nombre. Toda ruta, operación y evento usa esquemas de aquí o de otro contrato. */
  readonly schemas: Readonly<Record<string, z.ZodType>>;
  readonly routes: Readonly<Record<string, RouteDefinition>>;
  readonly operations: Readonly<Record<string, OperationDefinition>>;
  readonly events: Readonly<Record<string, EventDefinition>>;
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

/**
 * Reúne el contrato de un servicio y valida su coherencia local: nombres,
 * identificadores únicos y un catálogo completo por cada enum de errores.
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

  const routes = Object.values(contract.routes);
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
  checkUnique(
    service,
    'id de operación',
    Object.values(contract.operations).map((o) => o.id),
  );
  checkUnique(
    service,
    'tipo de evento',
    Object.values(contract.events).map((e) => e.type),
  );

  for (const [enumName, entries] of Object.entries(contract.errors)) {
    const values = contract.enums[enumName];
    if (!values) {
      throw new ContractDefinitionError(
        `Contrato ${service}: el catálogo ${enumName} no tiene enum en enums`,
      );
    }
    const codes = entries.map((e) => e.code).sort();
    const expected = Object.values(values).sort();
    if (codes.join() !== expected.join()) {
      throw new ContractDefinitionError(
        `Contrato ${service}: el catálogo ${enumName} no coincide con su enum`,
      );
    }
  }
  return Object.freeze(contract);
}
