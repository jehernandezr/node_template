import { z } from 'zod';
import {
  usesQuery,
  type MessageDefinition,
  type ServiceContract,
  type StringEnum,
} from '@contracts/platform';

/** Dialecto JSON Schema de todos los esquemas exportados. */
export const JSON_SCHEMA_DIALECT =
  'https://json-schema.org/draft/2020-12/schema';

/** Versión del formato de `contract.json`; el generador Dart la verifica. */
export const EXPORT_FORMAT_VERSION = 2;

export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export interface SchemaOwner {
  readonly service: string;
  readonly name: string;
}

/** Referencia JSON Schema al esquema `name` de `service`, vista desde `from`. */
export function schemaRef(from: string, service: string, name: string): string {
  return service === from
    ? `#/schemas/${name}`
    : `../../${service}/export/contract.json#/schemas/${name}`;
}

function fail(service: string, message: string): never {
  throw new Error(`contracts-export (${service}): ${message}`);
}

export function ownersOf(contracts: readonly ServiceContract[]) {
  const owners = new Map<z.ZodType, SchemaOwner>();
  for (const contract of contracts) {
    for (const [name, schema] of Object.entries(contract.schemas)) {
      const previous = owners.get(schema);
      if (previous) {
        fail(
          contract.service,
          `el esquema ${name} ya está registrado como ${previous.service}.${name}`,
        );
      }
      owners.set(schema, { service: contract.service, name });
    }
  }
  return owners;
}

function enumsOf(contract: ServiceContract): JsonObject {
  const result: JsonObject = {};
  for (const [name, values] of Object.entries(contract.enums)) {
    result[name] = {
      values: Object.entries(values as StringEnum).map(([key, value]) => {
        if (typeof value !== 'string') {
          fail(contract.service, `el enum ${name} no es de texto`);
        }
        return { name: key, value };
      }),
    };
  }
  return result;
}

function constantsOf(contract: ServiceContract): JsonObject {
  const result: JsonObject = {};
  for (const [name, values] of Object.entries(contract.constants)) {
    const entry: JsonObject = {};
    for (const [key, value] of Object.entries(values)) {
      const ok = (v: unknown) =>
        typeof v === 'string' ||
        typeof v === 'boolean' ||
        (typeof v === 'number' && Number.isFinite(v));
      if (!(ok(value) || (Array.isArray(value) && value.every(ok)))) {
        fail(contract.service, `la constante ${name}.${key} no es exportable`);
      }
      entry[key] = value as Json;
    }
    result[name] = entry;
  }
  return result;
}

/** Quita `$schema` e `$id` que zod agrega a cada esquema del registro. */
function cleanSchema(schema: Record<string, unknown>): JsonObject {
  const { $schema: _dialect, $id: _id, ...rest } = schema;
  void _dialect;
  void _id;
  return rest as JsonObject;
}

/**
 * Comprueba que los identificadores que viajan entre servicios no se repitan
 * entre contratos: ids de ruta y de operación, tipos de mensaje y nombres de
 * tópicos y colas. Dentro de cada contrato ya lo valida `defineServiceContract`.
 */
export function checkGlobalUniqueness(
  contracts: readonly ServiceContract[],
): void {
  const seen = new Map<string, string>();
  const claim = (kind: string, id: string, service: string) => {
    const key = `${kind}:${id}`;
    const previous = seen.get(key);
    if (previous !== undefined && previous !== service) {
      fail(service, `${kind} ${id} ya está declarado en ${previous}`);
    }
    seen.set(key, service);
  };
  for (const contract of contracts) {
    const { service } = contract;
    for (const route of Object.values(contract.routes)) {
      claim('la ruta', route.id, service);
    }
    for (const op of Object.values(contract.operations)) {
      claim('la operación', op.id, service);
    }
    for (const message of [
      ...Object.values(contract.events),
      ...Object.values(contract.commands),
    ]) {
      claim('el mensaje', message.type, service);
    }
    for (const target of [
      ...Object.values(contract.topics),
      ...Object.values(contract.queues),
    ]) {
      claim('el tópico o la cola', target.name, service);
    }
  }
}

/**
 * Construye el `contract.json` de cada servicio. Es una función pura: no lee
 * ni escribe archivos, así se prueba sin tocar el disco.
 */
export function buildExport(
  contracts: readonly ServiceContract[],
): Map<string, JsonObject> {
  checkGlobalUniqueness(contracts);
  const owners = ownersOf(contracts);
  const knownCodes = new Set<string>();
  for (const contract of contracts) {
    for (const entries of Object.values(contract.errors)) {
      for (const entry of entries) {
        if (knownCodes.has(entry.code)) {
          fail(contract.service, `código de error repetido ${entry.code}`);
        }
        knownCodes.add(entry.code);
      }
    }
  }

  const registry = z.registry<{ id: string }>();
  for (const [schema, owner] of owners) {
    registry.add(schema, { id: `${owner.service}/${owner.name}` });
  }

  const result = new Map<string, JsonObject>();
  for (const contract of contracts) {
    const { service } = contract;
    const refOf = (schema: z.ZodType, where: string): Json => {
      const owner = owners.get(schema);
      if (!owner) fail(service, `${where} usa un esquema sin nombre`);
      return { $ref: schemaRef(service, owner.service, owner.name) };
    };
    const checkErrors = (codes: readonly string[], where: string) => {
      for (const code of codes) {
        if (!knownCodes.has(code)) {
          fail(
            service,
            `${where} declara ${code}, que no está en ningún catálogo`,
          );
        }
      }
    };

    const generated = z.toJSONSchema(registry, {
      target: 'draft-2020-12',
      io: 'input',
      unrepresentable: 'throw',
      uri: (id) => {
        const [owner, name] = id.split('/');
        return schemaRef(service, owner, name);
      },
    }).schemas;
    const schemas: JsonObject = {};
    for (const name of Object.keys(contract.schemas)) {
      schemas[name] = cleanSchema(generated[`${service}/${name}`]);
    }

    const routes: Json[] = Object.entries(contract.routes).map(
      ([name, route]) => {
        checkErrors(route.errors, `la ruta ${name}`);
        const access: JsonObject = { kind: route.access.kind };
        if (route.access.permissions) {
          access['permissions'] = [...route.access.permissions];
        }
        if (route.access.platformRoles) {
          access['platformRoles'] = [...route.access.platformRoles];
        }
        if (route.access.mfaMaxAgeMinutes !== undefined) {
          access['mfaMaxAgeMinutes'] = route.access.mfaMaxAgeMinutes;
        }
        const entry: JsonObject = {
          name,
          id: route.id,
          method: route.method,
          path: route.path,
          version: route.version,
          pathParams: [...route.pathParams],
          requestLocation: usesQuery(route.method) ? 'query' : 'body',
          queryParams: route.queryParams.map((param) => ({
            name: param.name,
            kind: param.kind,
            list: param.list,
          })),
          request: refOf(route.request, `la ruta ${name}`),
          response: route.response
            ? refOf(route.response, `la ruta ${name}`)
            : null,
          successStatus: route.successStatus,
          errors: [...route.errors],
          access,
        };
        if (route.deprecated) {
          const deprecated: JsonObject = {
            since: route.deprecated.since,
            sunset: route.deprecated.sunset,
          };
          if (route.deprecated.replacement !== undefined) {
            deprecated['replacement'] = route.deprecated.replacement;
          }
          entry['deprecated'] = deprecated;
        }
        entry['description'] = route.description;
        return entry;
      },
    );

    const operations: Json[] = Object.entries(contract.operations).map(
      ([name, op]) => {
        checkErrors(op.errors, `la operación ${name}`);
        const entry: JsonObject = {
          name,
          id: op.id,
          version: op.version,
          input: refOf(op.input, `la operación ${name}`),
          output: refOf(op.output, `la operación ${name}`),
          idempotent: op.idempotent,
          mutating: op.mutating,
        };
        if (op.compensatedBy !== undefined) {
          entry['compensatedBy'] = op.compensatedBy;
        }
        if (op.compensationReason !== undefined) {
          entry['compensationReason'] = op.compensationReason;
        }
        entry['errors'] = [...op.errors];
        if (op.timeoutMs !== undefined) entry['timeoutMs'] = op.timeoutMs;
        if (op.retry !== undefined) entry['retry'] = { ...op.retry };
        entry['description'] = op.description;
        return entry;
      },
    );

    const messagesOf = (
      entries: Readonly<Record<string, MessageDefinition>>,
      label: string,
    ): Json[] =>
      Object.entries(entries).map(([name, message]) => ({
        name,
        type: message.type,
        kind: message.kind,
        version: message.version,
        payload: refOf(message.payload, `${label} ${name}`),
        description: message.description,
      }));
    const events = messagesOf(contract.events, 'el evento');
    const commands = messagesOf(contract.commands, 'el comando');

    const errors: JsonObject = {};
    for (const [enumName, entries] of Object.entries(contract.errors)) {
      const names = new Map(
        Object.entries(contract.enums[enumName]).map(([key, value]) => [
          value,
          key,
        ]),
      );
      errors[enumName] = entries.map((entry) => ({
        name:
          names.get(entry.code) ?? fail(service, `sin nombre ${entry.code}`),
        code: entry.code,
        httpStatus: entry.httpStatus,
        retryable: entry.retryable,
        audience: entry.audience,
        messageKey: entry.messageKey,
        description: entry.description,
      }));
    }

    result.set(service, {
      $comment:
        'GENERADO por backend/tools/contracts-export. No editar: cambia el contrato en TypeScript y ejecuta pnpm nx run contracts-export:export.',
      formatVersion: EXPORT_FORMAT_VERSION,
      jsonSchemaDialect: JSON_SCHEMA_DIALECT,
      service,
      description: contract.description,
      enums: enumsOf(contract),
      constants: constantsOf(contract),
      schemas,
      routes,
      operations,
      events,
      commands,
      errors,
    });
  }
  return result;
}
