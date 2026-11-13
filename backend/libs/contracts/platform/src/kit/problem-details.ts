import { ErrorAudience } from '../enums/error-audience.enum.js';
import { PlatformErrorCode } from '../enums/platform-error-code.enum.js';
import { platformErrorCatalog } from '../errors/platform-error-catalog.js';
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

const UNEXPECTED = platformErrorCatalog.find(
  (entry) => entry.code === PlatformErrorCode.InternalUnexpected,
) as ErrorCatalogEntry;

/**
 * Construye la respuesta Problem Details a partir de una entrada del catálogo.
 * `type` apunta a la documentación del código: `${typeBaseUrl}/errors/${code}`.
 *
 * Un código con `audience: internal` nunca llega al cliente: la respuesta es
 * `PLATFORM.INTERNAL.UNEXPECTED` con su `traceId` e `instance`, sin `detail`
 * ni `errors`, y con el título de esa entrada.
 */
export function toProblemDetails(input: ToProblemDetailsInput): ProblemDetails {
  const { instance, traceId, typeBaseUrl } = input;
  const internal = input.entry.audience === ErrorAudience.Internal;
  const entry = internal ? UNEXPECTED : input.entry;
  const problem: ProblemDetails = {
    type: `${typeBaseUrl}/errors/${entry.code}`,
    title: internal ? UNEXPECTED.description : input.title,
    status: entry.httpStatus,
    code: entry.code,
  };
  if (!internal && input.detail !== undefined) problem.detail = input.detail;
  if (instance !== undefined) problem.instance = instance;
  if (traceId !== undefined) problem.traceId = traceId;
  if (!internal && input.errors !== undefined) problem.errors = input.errors;
  return problem;
}
