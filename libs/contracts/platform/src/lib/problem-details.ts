import type { ErrorCatalogEntry } from './error-catalog.js';

/**
 * Detalle de un campo inválido o de un error parcial.
 */
export interface ProblemFieldError {
  field?: string;
  code: string;
  message?: string;
}

/**
 * Respuesta de error RFC 9457 (Problem Details) con extensiones de la plataforma.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  code: string;
  traceId?: string;
  errors?: ProblemFieldError[];
}

export interface ToProblemDetailsInput {
  entry: ErrorCatalogEntry;
  title: string;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: ProblemFieldError[];
  typeBaseUrl: string;
}

/**
 * Construye la respuesta Problem Details a partir de una entrada del catálogo.
 * `type` apunta a la documentación del código: `${typeBaseUrl}/errors/${code}`.
 */
export function toProblemDetails(input: ToProblemDetailsInput): ProblemDetails {
  const { entry, title, detail, instance, traceId, errors, typeBaseUrl } =
    input;
  const problem: ProblemDetails = {
    type: `${typeBaseUrl}/errors/${entry.code}`,
    title,
    status: entry.httpStatus,
    code: entry.code,
  };
  if (detail !== undefined) problem.detail = detail;
  if (instance !== undefined) problem.instance = instance;
  if (traceId !== undefined) problem.traceId = traceId;
  if (errors !== undefined) problem.errors = errors;
  return problem;
}
