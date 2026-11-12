import { z } from 'zod';
import {
  usesQuery,
  type ServiceContract,
  type StringEnum,
} from '@contracts/platform';

/** Dialecto JSON Schema de todos los esquemas exportados. */
export const JSON_SCHEMA_DIALECT =
  'https://json-schema.org/draft/2020-12/schema';

/** Versión del formato de `contract.json`; el generador Dart la verifica. */
export const EXPORT_FORMAT_VERSION = 1;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

interface SchemaOwner {
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

function ownersOf(contracts: readonly ServiceContract[]) {
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
 * Construye el `contract.json` de cada servicio. Es una función pura: no lee
 * ni escribe archivos, así se prueba sin tocar el disco.
 */
export function buildExport(
  contracts: readonly ServiceContract[],
): Map<string, JsonObject> {
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
        return {
          name,
          id: route.id,
          method: route.method,
          path: route.path,
          pathParams: [...route.pathParams],
          requestLocation: usesQuery(route.method) ? 'query' : 'body',
          request: refOf(route.request, `la ruta ${name}`),
          response: route.response
            ? refOf(route.response, `la ruta ${name}`)
            : null,
          successStatus: route.successStatus,
          errors: [...route.errors],
          access,
          description: route.description,
        };
      },
    );

    const operations: Json[] = Object.entries(contract.operations).map(
      ([name, op]) => {
        checkErrors(op.errors, `la operación ${name}`);
        const entry: JsonObject = {
          name,
          id: op.id,
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

    const events: Json[] = Object.entries(contract.events).map(
      ([name, event]) => ({
        name,
        type: event.type,
        version: event.version,
        payload: refOf(event.payload, `el evento ${name}`),
        description: event.description,
      }),
    );

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
      errors,
    });
  }
  return result;
}
