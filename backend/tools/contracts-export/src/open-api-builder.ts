import { OPENAPI_VERSION } from './export-constants.js';
import type { Json, JsonObject } from './json.type.js';

/** A route as it appears in `contract.json`. */
interface ExportedRoute {
  readonly id: string;
  readonly method: string;
  readonly path: string;
  readonly pathParams: readonly string[];
  readonly requestLocation: string;
  readonly queryParams: readonly {
    readonly name: string;
    readonly kind: string;
    readonly list: boolean;
  }[];
  readonly request: Json;
  readonly response: Json;
  readonly successStatus: number;
  readonly errors: readonly string[];
  readonly access: { readonly kind: string; readonly permissions?: string[] };
  readonly description: string;
}

/** How the content of a request or response is named by its location. */
enum MediaType {
  Json = 'application/json',
  Problem = 'application/problem+json',
}

/**
 * Builds a service's OpenAPI 3.1 from its `contract.json`: its routes with parameters, body, success response and
 * errors, and its schemas as components. `$ref` entries to another contract point to that contract's `openapi.json`.
 */
export class OpenApiBuilder {
  private static readonly LOCAL_SCHEMA = '#/schemas/';
  private static readonly FOREIGN_SCHEMA = /export\/contract\.json#\/schemas\//;
  private static readonly PROBLEM_REF = {
    $ref: '../../platform/export/openapi.json#/components/schemas/ProblemDetails',
  };
  private static readonly BEARER = 'bearerAuth';

  /**
   * Builds the OpenAPI document of a service from its exported contract.
   * @param contract Exported contract.
   * @returns The OpenAPI document.
   */
  build(contract: JsonObject): JsonObject {
    const routes = (contract['routes'] ?? []) as unknown as ExportedRoute[];
    const paths: Record<string, Record<string, Json>> = {};
    for (const route of routes) {
      paths[route.path] = {
        ...paths[route.path],
        [route.method.toLowerCase()]: this.operation(route),
      };
    }
    return {
      openapi: OPENAPI_VERSION,
      jsonSchemaDialect: contract['jsonSchemaDialect'] ?? null,
      info: {
        title: String(contract['service']),
        version: String(contract['formatVersion']),
        description: contract['description'] ?? '',
      },
      paths,
      components: {
        schemas: this.rewrite(contract['schemas'] ?? {}),
        securitySchemes: {
          [OpenApiBuilder.BEARER]: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    };
  }

  private operation(route: ExportedRoute): JsonObject {
    const operation: JsonObject = {
      operationId: route.id,
      description: route.description,
      parameters: [
        ...route.pathParams.map((name) => ({
          name,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })),
        ...route.queryParams.map((param) => ({
          name: param.name,
          in: 'query',
          required: false,
          schema: param.list
            ? { type: 'array', items: { type: param.kind } }
            : { type: param.kind },
        })),
      ],
      responses: {
        [String(route.successStatus)]: this.success(route),
        default: {
          description: `Problem Details with one of these codes: ${route.errors.join(', ')}.`,
          content: {
            [MediaType.Problem]: { schema: OpenApiBuilder.PROBLEM_REF },
          },
        },
      },
      'x-error-codes': [...route.errors],
    };
    if (route.requestLocation === 'body' && route.request !== null) {
      operation['requestBody'] = {
        required: true,
        content: { [MediaType.Json]: { schema: this.rewrite(route.request) } },
      };
    }
    if (route.access.kind !== 'public') {
      operation['security'] = [{ [OpenApiBuilder.BEARER]: [] }];
      operation['x-permissions'] = [...(route.access.permissions ?? [])];
    }
    return operation;
  }

  private success(route: ExportedRoute): JsonObject {
    if (route.response === null) {
      return { description: 'No content.' };
    }
    return {
      description: 'Successful response.',
      content: { [MediaType.Json]: { schema: this.rewrite(route.response) } },
    };
  }

  /** Replaces the `contract.json` `$ref` entries with OpenAPI component ones, here and in the other contracts. */
  private rewrite(value: Json): Json {
    if (Array.isArray(value)) {
      return value.map((item) => this.rewrite(item));
    }
    if (value === null || typeof value !== 'object') {
      return value;
    }
    const result: JsonObject = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] =
        key === '$ref' && typeof nested === 'string'
          ? OpenApiBuilder.refOf(nested)
          : this.rewrite(nested);
    }
    return result;
  }

  private static refOf(ref: string): string {
    if (ref.startsWith(OpenApiBuilder.LOCAL_SCHEMA)) {
      return `#/components/schemas/${ref.slice(OpenApiBuilder.LOCAL_SCHEMA.length)}`;
    }
    return ref.replace(
      OpenApiBuilder.FOREIGN_SCHEMA,
      'export/openapi.json#/components/schemas/',
    );
  }
}
