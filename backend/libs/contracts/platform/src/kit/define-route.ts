import type { z } from 'zod';
import { HttpMethod } from '../enums/http-method.enum.js';
import { EmptySchema } from '../schemas/empty.schema.js';
import type { AccessRequirement } from '../types/access-requirement.type.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import { ERROR_CODE_PATTERN } from './error-catalog.js';

/** Esquema de petición de una ruta: siempre un objeto. */
export type RouteRequestSchema = z.ZodObject;

/** Ruta HTTP pública: lo que el front llama y el servidor expone. */
export interface RouteDefinition<
  Req extends RouteRequestSchema = RouteRequestSchema,
  Res extends z.ZodType | null = z.ZodType | null,
> {
  /** Identificador estable, por ejemplo `identity.auth.sign-in`. */
  readonly id: string;
  readonly method: HttpMethod;
  /** Ruta con parámetros entre llaves, por ejemplo `/v1/me/sessions/{sessionId}`. */
  readonly path: string;
  /** Campos de la petición que van en la ruta. */
  readonly pathParams: readonly string[];
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
  readonly description: string;
}

const ROUTE_ID = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/;
const PATH = /^\/[A-Za-z0-9\-._~/{}]*$/;
const PATH_PARAM = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const QUERY_METHODS = new Set([HttpMethod.Get, HttpMethod.Delete]);

/** Indica si los campos que no van en la ruta viajan en la query (GET y DELETE). */
export function usesQuery(method: HttpMethod): boolean {
  return QUERY_METHODS.has(method);
}

/**
 * Declara una ruta HTTP. Valida al cargar el módulo que la ruta, los parámetros
 * y los códigos de error tengan el formato esperado.
 */
export function defineRoute<
  Req extends RouteRequestSchema = typeof EmptySchema,
  Res extends z.ZodType | null = null,
>(spec: RouteSpec<Req, Res>): RouteDefinition<Req, Res> {
  const fail = (reason: string): never => {
    throw new ContractDefinitionError(`Ruta ${spec.id}: ${reason}`);
  };
  if (!ROUTE_ID.test(spec.id)) fail('id inválido');
  if (!PATH.test(spec.path)) fail(`path inválido ${spec.path}`);
  if (!spec.description.trim()) fail('falta la descripción');

  const request = (spec.request ?? EmptySchema) as Req;
  const response = (spec.response ?? null) as Res;
  const shape = request.shape as Record<string, unknown>;
  const pathParams = [...spec.path.matchAll(PATH_PARAM)].map((m) => m[1]);
  for (const param of pathParams) {
    if (!(param in shape)) fail(`el parámetro {${param}} no está en request`);
  }
  if (new Set(pathParams).size !== pathParams.length) {
    fail('parámetros de ruta repetidos');
  }
  const errors = [...(spec.errors ?? [])];
  for (const code of errors) {
    if (!ERROR_CODE_PATTERN.test(code)) fail(`código inválido ${code}`);
  }
  if (new Set(errors).size !== errors.length) fail('códigos repetidos');

  const successStatus = spec.successStatus ?? (response ? 200 : 204);
  if (successStatus < 200 || successStatus > 299) {
    fail(`estado de éxito inválido ${successStatus}`);
  }

  return Object.freeze({
    id: spec.id,
    method: spec.method,
    path: spec.path,
    pathParams: Object.freeze(pathParams),
    request,
    response,
    successStatus,
    errors: Object.freeze(errors),
    access: spec.access,
    description: spec.description,
  });
}

/** Tipo de la petición de una ruta. */
export type RouteRequest<R extends RouteDefinition> = z.input<R['request']>;

/** Tipo de la respuesta de una ruta (`void` si no tiene cuerpo). */
export type RouteResponse<R extends RouteDefinition> =
  R['response'] extends z.ZodType ? z.output<R['response']> : void;
