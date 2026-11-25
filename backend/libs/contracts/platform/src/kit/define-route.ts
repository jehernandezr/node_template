import type { z } from 'zod';
import { HttpMethod } from '../enums/http-method.enum.js';
import { EmptySchema } from '../schemas/empty.schema.js';
import type { AccessRequirement } from '../types/access-requirement.type.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import { ERROR_CODE_PATTERN } from './error-catalog.js';
import { queryParamsOf, type QueryParam } from './query-params.js';

/** Request schema of a route: always an object. */
export type RouteRequestSchema = z.ZodObject;

/**
 * Deprecation of a route. The server responds with the `Deprecation`,
 * `Sunset` and `Link` headers, and after `sunset` responds 410 with
 * `PLATFORM.API.VERSION_SUNSET`.
 */
export interface RouteDeprecation {
  /** `YYYY-MM-DD` date from which the route is deprecated. */
  readonly since: string;
  /** `YYYY-MM-DD` date on which the route stops responding. */
  readonly sunset: string;
  /** Id of the route that replaces it, in the same contract. */
  readonly replacement?: string;
}

/** Public HTTP route: what the front calls and the server exposes. */
export interface RouteDefinition<
  Req extends RouteRequestSchema = RouteRequestSchema,
  Res extends z.ZodType | null = z.ZodType | null,
> {
  /** Stable identifier, for example `identity.auth.sign-in`. */
  readonly id: string;
  readonly method: HttpMethod;
  /** Path with the major version and parameters in braces, for example `/v1/me/sessions/{sessionId}`. */
  readonly path: string;
  /** Major API version, taken from the first segment of `path`. */
  readonly version: number;
  /** Request fields that go in the path. */
  readonly pathParams: readonly string[];
  /**
   * Fields that travel in the query (GET and DELETE) with the type they are
   * converted to before validation. Empty for the other methods.
   */
  readonly queryParams: readonly QueryParam[];
  /**
   * Full request. The `pathParams` fields go in the path; the rest go
   * in the query for GET and DELETE, and in the JSON body for the other methods.
   */
  readonly request: Req;
  /** Response, or null when the route responds without a body. */
  readonly response: Res;
  readonly successStatus: number;
  /** Error codes the route can respond with, in addition to the validation ones. */
  readonly errors: readonly string[];
  readonly access: AccessRequirement;
  /** Present when the route is deprecated. */
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
/** The path starts with the major version: `/v1/...`. */
const PATH = /^\/v([1-9][0-9]*)\/[A-Za-z0-9\-._~/{}]*$/;
const PATH_PARAM = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const QUERY_METHODS = new Set([HttpMethod.Get, HttpMethod.Delete]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Whether the fields that do not go in the path travel in the query (GET and DELETE). */
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
    fail('deprecated.since and deprecated.sunset are YYYY-MM-DD dates');
  }
  if (deprecated.sunset <= deprecated.since) {
    fail('deprecated.sunset must be after deprecated.since');
  }
  if (
    deprecated.replacement !== undefined &&
    !ROUTE_ID.test(deprecated.replacement)
  ) {
    fail(`invalid deprecated.replacement ${deprecated.replacement}`);
  }
  const copy: { -readonly [K in keyof RouteDeprecation]: RouteDeprecation[K] } =
    { since: deprecated.since, sunset: deprecated.sunset };
  if (deprecated.replacement !== undefined) {
    copy.replacement = deprecated.replacement;
  }
  return Object.freeze(copy);
}

/**
 * Declares an HTTP route. Validates when the module loads that the path carries the
 * major version, that the parameters and error codes have the expected
 * format and that the query fields are scalars or lists of scalars.
 */
export function defineRoute<
  Req extends RouteRequestSchema = typeof EmptySchema,
  Res extends z.ZodType | null = null,
>(spec: RouteSpec<Req, Res>): RouteDefinition<Req, Res> {
  const fail = (reason: string): never => {
    throw new ContractDefinitionError(`Route ${spec.id}: ${reason}`);
  };
  if (!ROUTE_ID.test(spec.id)) fail('invalid id');
  const pathMatch = PATH.exec(spec.path);
  if (!pathMatch) fail(`invalid path ${spec.path}: it starts with /vN/`);
  if (!spec.description.trim()) fail('missing description');

  const request = (spec.request ?? EmptySchema) as Req;
  const response = (spec.response ?? null) as Res;
  const shape = request.shape as Record<string, z.ZodType>;
  const pathParams = [...spec.path.matchAll(PATH_PARAM)].map((m) => m[1]);
  for (const param of pathParams) {
    if (!(param in shape)) fail(`parameter {${param}} is not in request`);
  }
  if (new Set(pathParams).size !== pathParams.length) {
    fail('duplicate route parameters');
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
    if (!ERROR_CODE_PATTERN.test(code)) fail(`invalid code ${code}`);
  }
  if (new Set(errors).size !== errors.length) fail('duplicate codes');

  const successStatus = spec.successStatus ?? (response ? 200 : 204);
  if (successStatus < 200 || successStatus > 299) {
    fail(`invalid success status ${successStatus}`);
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

/** Request type of a route. */
export type RouteRequest<R extends RouteDefinition> = z.input<R['request']>;

/** Response type of a route (`void` if it has no body). */
export type RouteResponse<R extends RouteDefinition> =
  R['response'] extends z.ZodType ? z.output<R['response']> : void;
