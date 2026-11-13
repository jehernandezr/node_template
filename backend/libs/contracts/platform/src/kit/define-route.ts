import type { z } from 'zod';
import { HttpMethod } from '../enums/http-method.enum.js';
import { EmptySchema } from '../schemas/empty.schema.js';
import type { AccessRequirement } from '../types/access-requirement.type.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import { ERROR_CODE_PATTERN } from './error-catalog.js';
import { queryParamsOf, type QueryParam } from './query-params.js';

/** Esquema de petición de una ruta: siempre un objeto. */
export type RouteRequestSchema = z.ZodObject;

/**
 * Deprecación de una ruta. El servidor responde los headers `Deprecation`,
 * `Sunset` y `Link`, y después de `sunset` responde 410 con
 * `PLATFORM.API.VERSION_SUNSET`.
 */
export interface RouteDeprecation {
  /** Fecha `AAAA-MM-DD` desde la que la ruta está deprecada. */
  readonly since: string;
  /** Fecha `AAAA-MM-DD` en que la ruta deja de responder. */
  readonly sunset: string;
  /** Id de la ruta que la reemplaza, en el mismo contrato. */
  readonly replacement?: string;
}

/** Ruta HTTP pública: lo que el front llama y el servidor expone. */
export interface RouteDefinition<
  Req extends RouteRequestSchema = RouteRequestSchema,
  Res extends z.ZodType | null = z.ZodType | null,
> {
  /** Identificador estable, por ejemplo `identity.auth.sign-in`. */
  readonly id: string;
  readonly method: HttpMethod;
  /** Ruta con la versión mayor y parámetros entre llaves, por ejemplo `/v1/me/sessions/{sessionId}`. */
  readonly path: string;
  /** Versión mayor de la API, tomada del primer segmento de `path`. */
  readonly version: number;
  /** Campos de la petición que van en la ruta. */
  readonly pathParams: readonly string[];
  /**
   * Campos que viajan en la query (GET y DELETE) con el tipo al que se
   * convierten antes de validar. Vacío en los demás métodos.
   */
  readonly queryParams: readonly QueryParam[];
  /**
   * Petición completa. Los campos de `pathParams` van en la ruta; el resto va
   * en la query en GET y DELETE, y en el cuerpo JSON en los demás métodos.
   */
  readonly request: Req;
  /** Respuesta, o null cuando la ruta responde sin cuerpo. */
  readonly response: Res;
  readonly successStatus: number;
  /** Códigos de error que la ruta puede responder, además de los de validación. */
  readonly errors: readonly string[];
  readonly access: AccessRequirement;
  /** Presente cuando la ruta está deprecada. */
  readonly deprecated?: RouteDeprecation;
  readonly description: string;
}

export interface RouteSpec<
  Req extends RouteRequestSchema,
  Res extends z.ZodType | null,
> {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly request?: Req;
  readonly response?: Res;
  readonly successStatus?: number;
  readonly errors?: readonly string[];
  readonly access: AccessRequirement;
  readonly deprecated?: RouteDeprecation;
  readonly description: string;
}

const ROUTE_ID = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;
/** La ruta empieza con la versión mayor: `/v1/...`. */
const PATH = /^\/v([1-9][0-9]*)\/[A-Za-z0-9\-._~/{}]*$/;
const PATH_PARAM = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const QUERY_METHODS = new Set([HttpMethod.Get, HttpMethod.Delete]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Indica si los campos que no van en la ruta viajan en la query (GET y DELETE). */
export function usesQuery(method: HttpMethod): boolean {
  return QUERY_METHODS.has(method);
}

function isDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function checkDeprecation(
  deprecated: RouteDeprecation,
  fail: (reason: string) => never,
): RouteDeprecation {
  if (!isDate(deprecated.since) || !isDate(deprecated.sunset)) {
    fail('deprecated.since y deprecated.sunset son fechas AAAA-MM-DD');
  }
  if (deprecated.sunset <= deprecated.since) {
    fail('deprecated.sunset debe ser posterior a deprecated.since');
  }
  if (
    deprecated.replacement !== undefined &&
    !ROUTE_ID.test(deprecated.replacement)
  ) {
    fail(`deprecated.replacement inválido ${deprecated.replacement}`);
  }
  const copy: { -readonly [K in keyof RouteDeprecation]: RouteDeprecation[K] } =
    { since: deprecated.since, sunset: deprecated.sunset };
  if (deprecated.replacement !== undefined) {
    copy.replacement = deprecated.replacement;
  }
  return Object.freeze(copy);
}

/**
 * Declara una ruta HTTP. Valida al cargar el módulo que la ruta lleve la
 * versión mayor, que los parámetros y los códigos de error tengan el formato
 * esperado y que los campos de la query sean escalares o listas de escalares.
 */
export function defineRoute<
  Req extends RouteRequestSchema = typeof EmptySchema,
  Res extends z.ZodType | null = null,
>(spec: RouteSpec<Req, Res>): RouteDefinition<Req, Res> {
  const fail = (reason: string): never => {
    throw new ContractDefinitionError(`Ruta ${spec.id}: ${reason}`);
  };
  if (!ROUTE_ID.test(spec.id)) fail('id inválido');
  const pathMatch = PATH.exec(spec.path);
  if (!pathMatch) fail(`path inválido ${spec.path}: empieza con /vN/`);
  if (!spec.description.trim()) fail('falta la descripción');

  const request = (spec.request ?? EmptySchema) as Req;
  const response = (spec.response ?? null) as Res;
  const shape = request.shape as Record<string, z.ZodType>;
  const pathParams = [...spec.path.matchAll(PATH_PARAM)].map((m) => m[1]);
  for (const param of pathParams) {
    if (!(param in shape)) fail(`el parámetro {${param}} no está en request`);
  }
  if (new Set(pathParams).size !== pathParams.length) {
    fail('parámetros de ruta repetidos');
  }
  const queryParams = usesQuery(spec.method)
    ? queryParamsOf(
        shape,
        (name) => !pathParams.includes(name),
        (reason) => fail(reason),
      )
    : [];

  const errors = [...(spec.errors ?? [])];
  for (const code of errors) {
    if (!ERROR_CODE_PATTERN.test(code)) fail(`código inválido ${code}`);
  }
  if (new Set(errors).size !== errors.length) fail('códigos repetidos');

  const successStatus = spec.successStatus ?? (response ? 200 : 204);
  if (successStatus < 200 || successStatus > 299) {
    fail(`estado de éxito inválido ${successStatus}`);
  }

  const definition: {
    -readonly [K in keyof RouteDefinition<Req, Res>]: RouteDefinition<
      Req,
      Res
    >[K];
  } = {
    id: spec.id,
    method: spec.method,
    path: spec.path,
    version: Number(pathMatch?.[1]),
    pathParams: Object.freeze(pathParams),
    queryParams: Object.freeze(queryParams),
    request,
    response,
    successStatus,
    errors: Object.freeze(errors),
    access: spec.access,
    description: spec.description,
  };
  if (spec.deprecated !== undefined) {
    definition.deprecated = checkDeprecation(spec.deprecated, fail);
  }
  return Object.freeze(definition);
}

/** Tipo de la petición de una ruta. */
export type RouteRequest<R extends RouteDefinition> = z.input<R['request']>;

/** Tipo de la respuesta de una ruta (`void` si no tiene cuerpo). */
export type RouteResponse<R extends RouteDefinition> =
  R['response'] extends z.ZodType ? z.output<R['response']> : void;
