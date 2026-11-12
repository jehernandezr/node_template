import type { ErrorCatalogEntry } from '../types/error-catalog-entry.type.js';
import type {
  FieldError,
  ProblemDetails,
} from '../types/problem-details.type.js';

export interface ToProblemDetailsInput {
  entry: ErrorCatalogEntry;
  title: string;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: FieldError[];
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
